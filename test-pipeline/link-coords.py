import fitz, json, sys

def find_valid_coords(visited, coords):
    if not coords:
        return None
    for coord in coords:
        if not coord in visited:
            visited.add(coord)
            return coord
    return None

if __name__ == "__main__": 
    if len(sys.argv) != 2:
        print('{} Is an improper number of command line arguments'.format(len(sys.argv)))
        exit(1)

    with open(sys.argv[1], 'r+') as f_obj:
        link_infos = json.load(f_obj)
        doc = fitz.open('parent.pdf')

        print("Finding coordinates of links in parent PDF...")
        visited = set()
        for link_info in link_infos:
            page_num = 0
            for page in doc:
                coords = page.searchFor(link_info['text'])
                valid_coords = find_valid_coords(visited, coords)
                if not valid_coords:
                    page_num += 1
                    continue

                link_info["pgNum"] = page_num
                link_info["coords"] = {
                    "x0": round(valid_coords.x0),
                    "y0": round(valid_coords.y0),
                    "x1": round(valid_coords.x1),
                    "y1": round(valid_coords.y1)
                    }
                break

        f_obj.seek(0)
        json.dump(link_infos, f_obj)


def find_links(parent_pdf, links):
    doc = fitz.open(parent_pdf)
    
    visited = set()
    for link in links:
        page_num = 0
        for page in doc:
            coords = page.searchFor(links['text'])
            valid_coords = find_valid_coords(visited, coords)
            if not valid_coords:
                page_num += 1
                continue

            links["pg_num"] = page_num
            link_info["coords"] = {
                    "x0": round(valid_coords.x0),
                    "y0": round(valid_coords.y0),
                    "x1": round(valid_coords.x1),
                    "y1": round(valid_coords.y1)
                }
            break