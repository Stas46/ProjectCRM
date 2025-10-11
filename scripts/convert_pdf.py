#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Конвертация PDF в PNG с помощью PyMuPDF (fitz).
Использование:
  python scripts/convert_pdf.py <input_pdf> <output_dir> [dpi]

Выводит JSON в stdout:
  {"success": true, "pages": ["page_001.png", ...], "page_count": N}
или в случае ошибки:
  {"success": false, "error": "..."}
"""

import sys
import os
import json

def main():
    try:
        import fitz  # PyMuPDF
    except Exception as e:
        print(json.dumps({"success": False, "error": f"PyMuPDF (fitz) not available: {e}"}), flush=True)
        sys.exit(1)

    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: convert_pdf.py <input_pdf> <output_dir> [dpi]"}), flush=True)
        sys.exit(2)

    input_pdf = sys.argv[1]
    output_dir = sys.argv[2]
    dpi = 300
    if len(sys.argv) >= 4:
        try:
            dpi = int(sys.argv[3])
        except:
            pass

    try:
        if not os.path.isfile(input_pdf):
            print(json.dumps({"success": False, "error": f"Input not found: {input_pdf}"}), flush=True)
            sys.exit(3)

        os.makedirs(output_dir, exist_ok=True)

        doc = fitz.open(input_pdf)
        page_files = []
        for i, page in enumerate(doc):
            pix = page.get_pixmap(dpi=dpi)
            out_name = f"page_{i+1:03}.png"
            out_path = os.path.join(output_dir, out_name)
            pix.save(out_path)
            page_files.append(out_name)

        print(json.dumps({
            "success": True,
            "pages": page_files,
            "page_count": len(page_files)
        }), flush=True)
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}), flush=True)
        sys.exit(4)

if __name__ == "__main__":
    main()
