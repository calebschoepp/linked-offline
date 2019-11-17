import fitz, json, sys

if len(sys.argv) != 2:
    print('{} Is an improper number of command line arguments'.format(len(sys.argv)))
    exit(1)

with open(sys.argv[1], 'r+') as f_obj:
    link_infos = json.load(f_obj)
    doc = fitz.open('parent.pdf')

    print("Finding coordinates of links in parent PDF...")

    for link_info in link_infos:
        page_num = 0
        for page in doc:
            coords = page.searchFor(link_info['text'], hit_max=1)
            if not coords:
                page_num += 1
                continue
            link_info["pgNum"] = page_num
            link_info["coords"] = {
                "x0": round(coords[0].x0),
                "y0": round(coords[0].y0),
                "x1": round(coords[0].x1),
                "y1": round(coords[0].y1)
                }
            break

    f_obj.seek(0)
    json.dump(link_infos, f_obj)
