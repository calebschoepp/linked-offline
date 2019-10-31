package main

import (
	"bytes"
	"hash/fnv"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"golang.org/x/net/html"
	"golang.org/x/net/html/atom"
)

type page struct {
	order int
	url   string
	id    string
	html  string
}

type byPage []page

func (a byPage) Len() int           { return len(a) }
func (a byPage) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }
func (a byPage) Less(i, j int) bool { return a[i].order < a[j].order }

func test(baseHTML io.Reader) {
	// Testing parsing TODO Remove all this
	doc, err := goquery.NewDocumentFromReader(baseHTML)
	if err != nil {
		log.Fatal(err)
	}

	log.Println(doc.Find("a").Length())

	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		// For each item found...
		log.Printf("(%d)\n", i)
		log.Println(s.Html())
		log.Println(s.Text())
		log.Println(s.Attr("href"))
		s.SetAttr("href", "www.google.com")
	})

	html, err := goquery.OuterHtml(doc.First())
	if err != nil {
		log.Fatal(err)
	}
	log.Print(html)
}

func generate(baseHTML string) {
	// TODO do I want log fatal here or just bubble up error?
	// Build goquery document
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(baseHTML))
	if err != nil {
		log.Fatal(err)
	}

	var pages []page
	maxLinks := 2

	// Build selection of every link in base html and iterate over it
	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		// Temporary hold because I can't conver the 7 MB files I'm making
		if maxLinks <= 0 {
			return
		}
		maxLinks--

		// For each link...
		// See if it exsists
		link, ok := s.Attr("href")
		if !ok {
			// TODO handle error intelligently
		}
		newPage := page{order: i, url: link, id: linkToID(i, link)}

		pages = append(pages, newPage)

		// Set the link
		s.SetAttr("href", "#"+newPage.id)
	})

	baseHTML, err = goquery.OuterHtml(doc.First())
	if err != nil {
		// TODO handle better
		log.Fatal(err)
	}

	// Channels to communicate
	jobs := make(chan page, len(pages))
	results := make(chan page, len(pages))
	workerCount := len(pages)

	// Spin up workers
	for w := 0; w < workerCount; w++ {
		go getPageHTML(w, jobs, results)
	}

	// Send out jobs
	for j := 0; j < len(pages); j++ {
		jobs <- pages[j]
	}
	close(jobs)

	// Place results in an array and sort it
	var builtPages []page
	for r := 0; r < len(pages); r++ {
		builtPages = append(builtPages, <-results)
	}
	sort.Sort(byPage(builtPages))

	// Build all html into a single huge file to convert to pdf
	log.Print("Concatenating HTML")

	var sb strings.Builder
	sb.Write([]byte(baseHTML))
	for _, page := range builtPages {
		// log.Print(i)
		sb.WriteString(page.html)
	}
	masterHTML := sb.String()

	log.Print("Done")

	err = ioutil.WriteFile("out.html", []byte(masterHTML), 0664)
	if err != nil {
		log.Print("Failed to write to file")
		log.Fatal(err)
	}
}

func getPageHTML(id int, jobs <-chan page, results chan<- page) {
	// TODO maybe use chrome in the future for better SPA html rendering
	for p := range jobs {
		// Download HTML
		log.Print("Fetching ", p.url)
		resp, err := http.Get(p.url)
		if err != nil {
			// TODO handle properly (this is a sucky way to deal with this)
			log.Println("Failed to GET")
			results <- page{id: p.id,
				order: p.order,
				url:   p.url,
				html:  "<html><head></head><body>Failed</body></html>"}
		}
		defer resp.Body.Close()
		htmlBytes, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			// TODO Properly handle
			log.Println("Faild to read in HTMLbytes")
			log.Fatal(err)
		}

		// Alternate option using special http.client
		/*
			// TODO reuse http.Client using pointers
			client := &http.Client{}

			req, err := http.NewRequest("GET", p.url, nil)
			if err != nil {
				// TODO handle properly
				log.Fatal(err)
			}
			req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")

			res, err := client.Do(req)
			if err != nil {
				// TODO handle properly
				log.Fatal(err)
			}

			defer res.Body.Close()

			var htmlBytes []byte
			_, err = res.Body.Read(htmlBytes)
			if err != nil {
				// TODO handle properly
				log.Fatal(err)
			}
		*/

		// Insert page.id as name on link at root of document body with goquery
		doc, err := goquery.NewDocumentFromReader(bytes.NewReader(htmlBytes))
		if err != nil {
			// TODO handle properly
			log.Println("Failed to build doc")
			log.Fatal(err)
		}
		node := new(html.Node)
		node.Type = html.ElementNode
		node.Data = "a"
		node.DataAtom = atom.A
		doc.AddNodes(node).SetAttr("name", p.id)
		doc.Find("body").PrependNodes(node)
		p.html, err = goquery.OuterHtml(doc.First())
		if err != nil {
			// TODO handle properly
			log.Print("Failed to add target link node")
			log.Fatal(err)
		}

		// Place finished page into results channel
		results <- p
	}
}

func linkToID(i int, link string) string {
	h := fnv.New32a()
	h.Write([]byte(link))
	num := h.Sum32()
	return strconv.Itoa(i) + "-" + strconv.Itoa(int(num))
}
