# Receipt OCR Parser

A Python script that uses Tesseract OCR and GPT-4o-mini to extract and parse receipt information into structured JSON format.

## Setup

### 1. Install Tesseract OCR (macOS)

On Apple Silicon, install via Homebrew:

```bash
brew install tesseract
```

### 2. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 4. Set OpenAI API Key

Get your API key from https://platform.openai.com/api-keys and set it:

```bash
export OPENAI_API_KEY="your-api-key-here"
```

Or add it to your shell profile (`~/.zshrc` or `~/.bash_profile`):

```bash
echo 'export OPENAI_API_KEY="your-api-key-here"' >> ~/.zshrc
source ~/.zshrc
```

## Usage

```bash
# Basic usage (outputs to stdout)
python main.py receipt.jpg

# Save to file
python main.py receipt.jpg -o output.json

# Show OCR text before parsing
python main.py receipt.jpg --show-ocr
```

## Example Output

```json
{
  "merchant_name": "Coffee Shop",
  "date": "2024-01-15",
  "total": 12.50,
  "subtotal": 11.00,
  "tax": 1.00,
  "tip": 0.50,
  "items": [
    {
      "name": "Latte",
      "quantity": 1,
      "price": 5.50,
      "total": 5.50
    },
    {
      "name": "Croissant",
      "quantity": 1,
      "price": 3.50,
      "total": 3.50
    }
  ],
  "payment_method": "Credit Card",
  "transaction_id": "12345"
}
```

