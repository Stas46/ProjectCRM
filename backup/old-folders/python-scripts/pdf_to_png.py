#!/usr/bin/env python3
"""
Simple PDF to PNG Converter using PyMuPDF
PDF to PNG conversion without emojis for Windows compatibility
"""

import sys
import os
import json
import base64
import argparse

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    print("PyMuPDF not installed. Install with: pip install PyMuPDF")

def convert_pdf_to_images_pymupdf(pdf_path, dpi=200):
    """Convert PDF to images using PyMuPDF"""
    if not PYMUPDF_AVAILABLE:
        return {
            "success": False,
            "error": "PyMuPDF not installed. Install with: pip install PyMuPDF"
        }
    
    try:
        doc = fitz.open(pdf_path)
        images = []
        
        # print(f"Processing PDF: {len(doc)} pages")  # DEBUG: отключено для чистого JSON
        
        for i, page in enumerate(doc):
            # print(f"Converting page {i+1}...")  # DEBUG: отключено для чистого JSON
            
            # Создаем изображение с нужным DPI
            pix = page.get_pixmap(dpi=dpi)
            
            # Получаем PNG данные
            png_data = pix.tobytes("png")
            
            # Конвертируем в base64
            img_base64 = base64.b64encode(png_data).decode('utf-8')
            
            images.append({
                "page": i + 1,
                "base64": img_base64,
                "width": pix.width,
                "height": pix.height,
                "size_kb": len(png_data) // 1024
            })
            
            # print(f"Page {i+1}: {pix.width}x{pix.height}, {len(png_data)//1024} KB")  # DEBUG: отключено для чистого JSON
        
        doc.close()
        
        total_size = sum(img["size_kb"] for img in images)
        
        return {
            "success": True,
            "page_count": len(images),
            "images": images,
            "total_size_kb": total_size,
            "dpi": dpi
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Ошибка конвертации: {str(e)}"
        }

def save_images_to_files(images, output_dir="output"):
    """Save images to files"""
    try:
        os.makedirs(output_dir, exist_ok=True)
        saved_files = []
        
        for img in images:
            filename = f"page_{img['page']:03d}.png"
            filepath = os.path.join(output_dir, filename)
            
            # Декодируем base64 и сохраняем
            png_data = base64.b64decode(img["base64"])
            with open(filepath, 'wb') as f:
                f.write(png_data)
            
            saved_files.append({
                "page": img["page"],
                "filename": filename,
                "filepath": filepath,
                "size_kb": img["size_kb"]
            })
            
            # print(f"Saved: {filepath}")  # DEBUG: отключено для чистого JSON
        
        return {
            "success": True,
            "saved_files": saved_files,
            "output_dir": output_dir
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Ошибка сохранения: {str(e)}"
        }

def main():
    parser = argparse.ArgumentParser(description='PDF to PNG Converter using PyMuPDF')
    parser.add_argument('pdf_path', help='Path to PDF file')
    parser.add_argument('--dpi', type=int, default=200, help='DPI for conversion (default 200)')
    parser.add_argument('--output-dir', help='Output directory for images')
    parser.add_argument('--save-files', action='store_true', help='Save images to files')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.pdf_path):
        print(json.dumps({
            "success": False, 
            "error": "PDF file not found"
        }))
        return
    
    # Check PyMuPDF availability
    if not PYMUPDF_AVAILABLE:
        print(json.dumps({
            "success": False,
            "error": "PyMuPDF not installed. Install with: pip install PyMuPDF"
        }))
        return
    
    # print(f"Starting PDF conversion: {args.pdf_path}")  # DEBUG: отключено для чистого JSON
    # print(f"Parameters: DPI={args.dpi}")  # DEBUG: отключено для чистого JSON
    
    # Конвертируем PDF
    result = convert_pdf_to_images_pymupdf(args.pdf_path, args.dpi)
    
    if result["success"] and args.save_files:
        # Сохраняем файлы
        output_dir = args.output_dir or f"{os.path.splitext(os.path.basename(args.pdf_path))[0]}_images"
        save_result = save_images_to_files(result["images"], output_dir)
        result["file_save"] = save_result
    
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()