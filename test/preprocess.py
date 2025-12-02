"""
@author Eve
@description Simple receipt image preprocessing: resize to max 1024 width
"""

import cv2
import numpy as np
from typing import Tuple, Optional


def preprocess_receipt(
    image_path: str, output_path: Optional[str] = None, max_width: int = 1024
) -> Tuple[np.ndarray, bool]:
    """Preprocess a receipt image by resizing to max width while maintaining aspect ratio.

    Args:
        image_path: Path to input receipt image
        output_path: Optional path to save preprocessed image
        max_width: Maximum width for the resized image (default: 1024)

    Returns:
        Tuple of (preprocessed_image, success_flag)
    """
    # Load image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not load image from {image_path}")

    # Get current dimensions
    h, w = img.shape[:2]

    # Resize if width exceeds max_width
    if w > max_width:
        # Calculate new height maintaining aspect ratio
        new_w = max_width
        new_h = int(h * (max_width / w))
        img_resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
    else:
        img_resized = img

    # Save if output path provided
    if output_path:
        cv2.imwrite(output_path, img_resized)

    return img_resized, True
