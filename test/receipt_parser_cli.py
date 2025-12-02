#!/usr/bin/env python3
"""
@author Eve
@description CLI script to preprocess receipt images and parse them using GPT-4o vision model
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional

import cv2
import numpy as np
from dotenv import load_dotenv
from openai import OpenAI
from PIL import Image
import io
import base64

from preprocess import preprocess_receipt

load_dotenv()

# Default model - using GPT-4o for vision capabilities
_DEFAULT_MODEL = "gpt-5-nano-2025-08-07"
# _DEFAULT_MODEL = "gpt-5.1"

SYSTEM_PROMPT = """
You are a world-class receipt processing expert. Your task is to accurately extract information from a receipt image, including line item totals, and provide it in a structured JSON format.

Here is an example of a desired JSON output:

```json
{{
  "merchant_name": "Example Store",
  "transaction_timestamp": "2023-01-01T12:34:56",
  "currency": "USD",
  "items": [
    {{
      "name": "Item 1",
      "quantity": 2,
      "unit_price": 20.00,
      "total_price": 40.00,
      "category": "Food",
      "discounts": [
        {{
          "description": "10% off",
          "amount": 4.00
        }}
      ]
    }},
    {{
      "name": "Item 2",
      "quantity": 1,
      "unit_price": 35.50,
      "total_price": 35.50,
      "category": "Beverage",
      "discounts": []
    }}
  ],
  "subtotal": 75.50,
  "tax": 6.04,
  "fees": 0,
  "total": 81.54,
  "payment_method": "Credit Card",
  "receipt_id": "12345",
}}
```

Please extract the information from the receipt image and provide it in the following JSON schema:

```json
{json_schema_content}
```
"""

USER_PROMPT = "Extract the following."


def encode_image_to_base64(image: np.ndarray, max_size: int = 2048) -> str:
    """Encode a numpy array image to base64 string.

    Args:
        image: Image as numpy array (BGR format from OpenCV)
        max_size: Maximum dimension for resizing (maintains aspect ratio)

    Returns:
        Base64 encoded string of the image
    """
    # Convert BGR to RGB for PIL
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(image_rgb)

    # Resize if too large (maintain aspect ratio)
    w, h = pil_image.size
    if max(w, h) > max_size:
        if w > h:
            new_w = max_size
            new_h = int(h * max_size / w)
        else:
            new_h = max_size
            new_w = int(w * max_size / h)
        pil_image = pil_image.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # Convert to PNG and encode
    buffered = io.BytesIO()
    pil_image.save(buffered, format="PNG")
    img_bytes = buffered.getvalue()

    return base64.b64encode(img_bytes).decode("utf-8")


def parse_json_response(response: str) -> Dict[str, Any]:
    """Parse the LLM's JSON response, handling code blocks.

    Args:
        response: Raw response string from LLM

    Returns:
        Parsed JSON dictionary
    """
    response = response.strip()

    # Remove code block markers if present
    if response.startswith("```json"):
        response = response[7:]
    elif response.startswith("```"):
        response = response[3:]

    if response.endswith("```"):
        response = response[:-3]

    response = response.strip()

    try:
        return json.loads(response)
    except json.JSONDecodeError as e:
        return {
            "error": f"Failed to parse JSON response: {str(e)}",
            "raw_response": response,
        }


def process_receipt(
    image_path: str,
    json_schema: Optional[Dict[str, Any]] = None,
    model: str = _DEFAULT_MODEL,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    save_preprocessed: Optional[str] = None,
    skip_preprocessing: bool = False,
) -> Dict[str, Any]:
    """Process a receipt image: preprocess and parse with GPT-4o.

    Args:
        image_path: Path to receipt image
        json_schema: Optional custom JSON schema
        model: Model name to use
        api_key: Optional OpenAI API key
        base_url: Optional base URL for API
        save_preprocessed: Optional path to save preprocessed image
        skip_preprocessing: Skip preprocessing step

    Returns:
        Parsed receipt data as dictionary
    """
    # Default JSON schema
    if json_schema is None:
        json_schema = {
            "merchant_name": "string",
            "transaction_timestamp": "string",
            "currency": "USD",
            "items": [
                {
                    "name": "string",
                    "quantity": "number",
                    "unit_price": "number",
                    "total_price": "number",
                    "category": "string",
                    "discounts": [
                        {
                            "description": "string",
                            "amount": "number",
                        }
                    ],
                }
            ],
            "subtotal": "number",
            "tax": "number",
            "fees": "number",
            "total": "number",
            "payment_method": "string",
            "receipt_id": "string",
        }

    # Preprocess image
    if skip_preprocessing:
        print("Skipping preprocessing...")
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not load image from {image_path}")
        preprocessed_img = img
    else:
        print("Preprocessing receipt image (resizing to max 512 width)...")
        preprocessed_img, success = preprocess_receipt(
            image_path, output_path=save_preprocessed
        )
        if success:
            print("✓ Successfully preprocessed receipt image")

    # Encode image to base64
    print("Encoding image...")
    img_base64 = encode_image_to_base64(preprocessed_img)

    # Initialize OpenAI client
    api_key = api_key or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "OpenAI API key not provided. Set OPENAI_API_KEY environment variable or use --api_key"
        )

    base_url = base_url or os.getenv("OPENAI_BASE_URL")
    client = OpenAI(api_key=api_key, base_url=base_url)

    # Prepare system prompt
    system_prompt = SYSTEM_PROMPT.format(
        json_schema_content=json.dumps(json_schema, indent=2)
    )

    print(f"Sending to {model} for parsing...")
    response = client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        temperature=1,
        reasoning_effort="minimal",
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": USER_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{img_base64}"},
                    },
                ],
            },
        ],
    )

    # Parse response
    content = response.choices[0].message.content
    result = parse_json_response(content)

    print(f"Cost: {response.usage.completion_tokens} tokens")

    return result


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Extract structured data from receipt images using GPT-4o vision model.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s receipt.jpg
  %(prog)s receipt.jpg --save-preprocessed processed.jpg
  %(prog)s receipt.jpg --model gpt-4o-mini --skip-preprocessing
  %(prog)s receipt.jpg --schema-path custom_schema.json
        """,
    )

    parser.add_argument("image_path", type=str, help="Path to the receipt image file")

    parser.add_argument(
        "--schema-path", type=str, help="Path to a custom JSON schema file"
    )

    parser.add_argument(
        "--model",
        type=str,
        default=os.getenv("OPENAI_MODEL", _DEFAULT_MODEL),
        help=f"Model to use (default: {_DEFAULT_MODEL})",
    )

    parser.add_argument(
        "--api-key", type=str, help="OpenAI API key (or set OPENAI_API_KEY env var)"
    )

    parser.add_argument(
        "--base-url", type=str, help="Base URL for API (or set OPENAI_BASE_URL env var)"
    )

    parser.add_argument(
        "--save-preprocessed", type=str, help="Save the preprocessed image to this path"
    )

    parser.add_argument(
        "--skip-preprocessing",
        action="store_true",
        help="Skip image preprocessing step",
    )

    parser.add_argument(
        "--output", type=str, help="Save JSON output to file (default: print to stdout)"
    )

    args = parser.parse_args()

    # Validate image path
    if not os.path.exists(args.image_path):
        print(f"Error: Image file not found: {args.image_path}", file=sys.stderr)
        sys.exit(1)

    # Load JSON schema if provided
    json_schema = None
    if args.schema_path:
        if not os.path.exists(args.schema_path):
            print(f"Error: Schema file not found: {args.schema_path}", file=sys.stderr)
            sys.exit(1)
        with open(args.schema_path, "r") as f:
            json_schema = json.load(f)

    try:
        # Process receipt
        result = process_receipt(
            image_path=args.image_path,
            json_schema=json_schema,
            model=args.model,
            api_key=args.api_key,
            base_url=args.base_url,
            save_preprocessed=args.save_preprocessed,
            skip_preprocessing=args.skip_preprocessing,
        )

        # Output result
        output_json = json.dumps(result, indent=2, ensure_ascii=False)

        if args.output:
            with open(args.output, "w") as f:
                f.write(output_json)
            print(f"✓ Results saved to {args.output}")
        else:
            print("\n" + "=" * 50)
            print("EXTRACTED RECEIPT DATA")
            print("=" * 50)
            print(output_json)

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
