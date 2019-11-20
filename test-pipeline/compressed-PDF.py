import sys, os, json, subprocess

def compress_pdf(pdf):
    # Generate the compressed pdf at filename XX.comp
    if not os.path.exists(pdf):
        print("{} Does not exsist".format(pdf))
        return 0
    compressed_pdf = pdf + ".comp"

    args = [
        'ghostscript',
        '-sDEVICE=pdfwrite',
        '-dPDFSETTINGS=/screen',
        '-dCompatibilityLevel=1.4',
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        '-sOutputFile=' + compressed_pdf,
        pdf
    ]
    subprocess.run(args)

    # Keep either the original or compressed around based on who is smaller
    original_size = os.path.getsize(pdf)
    compressed_size = os.path.getsize(compressed_pdf)

    saved = round((original_size - compressed_size) / 1000000, 2)

    if original_size < compressed_size:
        os.remove(compressed_pdf)
    else:
        os.remove(pdf)
        os.rename(compressed_pdf, pdf)
        print("Compressed {} saving {}MB...".format(pdf, saved))
    return saved


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print('{} Is an improper number of command line arguments'.format(len(sys.argv)))
        exit(1)

    with open(sys.argv[1], 'r+') as f_obj:
        link_infos = json.load(f_obj)
        saved = 0

        print("Compressing PDFs...")
        for pdf in [link_info["id"] for link_info in link_infos]:
            saved += compress_pdf(pdf)
        compress_pdf('parent.pdf')
        print("{}MB saved in total".format(round(saved, 2)))



# potentially breaking args

    # args = [
    # "na", # actual value doesn't matter
    # "-sOutputFile=" + compressed_pdf,
    # "-q",
    # "-dNOPAUSE",
    # "-dBATCH",
    # "-dQUIET"
    # "-dSAFER",
    # "-dPDFA=2",
    # "-dPDFACompatibilityPolicy=1",
    # "-dSimulateOverprint=true",
    # "-sDEVICE=pdfwrite",
    # "-dCompatibilityLevel=1.3",
    # "-dPDFSETTINGS=/screen",
    # "-dEmbedAllFonts=true",
    # "-dSubsetFonts=true",
    # "-dAutoRotatePages=/None",
    # "-dColorImageDownsampleType=/Bicubic",
    # "-dColorImageResolution=150",
    # "-dGrayImageDownsampleType=/Bicubic",
    # "-dGrayImageResolution=150",
    # "-dMonoImageDownsampleType=/Bicubic",
    # "-dMonoImageResolution=150",
    # pdf
    # ]