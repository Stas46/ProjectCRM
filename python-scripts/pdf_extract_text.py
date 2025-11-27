#!/usr/bin/env python3
"""
Извлечение текста из PDF через PyMuPDF
Быстрее и надёжнее OCR для PDF с текстовым слоем
"""

import sys
import json
import argparse

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

def extract_text_from_pdf(pdf_path: str, min_chars: int = 50) -> dict:
    """
    Извлекает текст из PDF.
    Возвращает текст если он есть, или флаг что нужен OCR.
    """
    if not PYMUPDF_AVAILABLE:
        return {
            "success": False,
            "needs_ocr": True,
            "error": "PyMuPDF not installed"
        }
    
    try:
        doc = fitz.open(pdf_path)
        all_text = []
        
        for page_num, page in enumerate(doc):
            page_text = page.get_text()
            if page_text.strip():
                all_text.append(page_text)
        
        doc.close()
        
        full_text = '\n\n=== СЛЕДУЮЩАЯ СТРАНИЦА ===\n\n'.join(all_text)
        char_count = len(full_text.strip())
        
        # Если текста достаточно — возвращаем его
        if char_count >= min_chars:
            return {
                "success": True,
                "needs_ocr": False,
                "text": full_text,
                "char_count": char_count,
                "page_count": len(all_text),
                "method": "pymupdf_text"
            }
        else:
            # Текста мало или нет — нужен OCR
            return {
                "success": True,
                "needs_ocr": True,
                "text": full_text if full_text.strip() else "",
                "char_count": char_count,
                "reason": f"Найдено только {char_count} символов (минимум {min_chars})"
            }
            
    except Exception as e:
        return {
            "success": False,
            "needs_ocr": True,
            "error": str(e)
        }


def main():
    parser = argparse.ArgumentParser(description='Extract text from PDF using PyMuPDF')
    parser.add_argument('pdf_path', help='Path to PDF file')
    parser.add_argument('--min-chars', type=int, default=50, 
                        help='Minimum characters to consider text extraction successful')
    
    args = parser.parse_args()
    
    result = extract_text_from_pdf(args.pdf_path, args.min_chars)
    
    # Выводим JSON для парсинга в Node.js
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
