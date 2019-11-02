package main

import (
	"bytes"
	"hash/fnv"
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

type linkPage struct {
	order int
	url   string
	id    string
	html  string
}

type byLinkPage []linkPage

func (a byLinkPage) Len() int           { return len(a) }
func (a byLinkPage) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }
func (a byLinkPage) Less(i, j int) bool { return a[i].order < a[j].order }

func generate(baseHTML string) {
	// TODO do I want log fatal here or just bubble up error?
	// Build goquery document
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(baseHTML))
	if err != nil {
		log.Fatal(err)
	}

	var linkPages []linkPage
	maxLinks := 50

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
		newLinkPage := linkPage{order: i, url: link, id: linkToID(i, link)}

		linkPages = append(linkPages, newLinkPage)

		// Set the link
		s.SetAttr("href", "#"+newLinkPage.id)
	})

	baseHTML, err = goquery.OuterHtml(doc.First())
	if err != nil {
		// TODO handle better
		log.Fatal(err)
	}

	// Channels to communicate
	jobs := make(chan linkPage, len(linkPages))
	results := make(chan linkPage, len(linkPages))
	workerCount := len(linkPages)

	// Spin up workers
	for w := 0; w < workerCount; w++ {
		go worker(w, jobs, results)
	}

	// Send out jobs
	for j := 0; j < len(linkPages); j++ {
		jobs <- linkPages[j]
	}
	close(jobs)

	// Place results in an array and sort it
	var builtLinkPages []linkPage
	for r := 0; r < len(linkPages); r++ {
		builtLinkPages = append(builtLinkPages, <-results)
	}
	sort.Sort(byLinkPage(builtLinkPages))

	// Build all html into a single huge file to convert to pdf
	log.Print("Concatenating HTML")

	var sb strings.Builder
	sb.Write([]byte(baseHTML))
	for _, linkPage := range builtLinkPages {
		sb.WriteString(linkPage.html)

		// TODO REMOVE
		ioutil.WriteFile("htmlout/"+linkPage.url+".html", []byte(linkPage.html), 0664)
	}
	masterHTML := sb.String()

	// Write the HTML to a file for inspection
	err = ioutil.WriteFile("out.html", []byte(masterHTML), 0664)
	if err != nil {
		log.Print("Failed to write to file")
		log.Fatal(err)
	}

	log.Print("Writing PDF")

	// Turn the html into a pdf and write to file
	pdf, err := buildPDFChrome([]byte(masterHTML))
	if err != nil {
		log.Print(err.Error())
		log.Fatal(err)
	}
	err = ioutil.WriteFile("output.pdf", []byte(pdf), 0664)
	if err != nil {
		log.Print("Failed to write to file")
		log.Fatal(err)
	}
	log.Print("Done")
}

func worker(id int, jobs <-chan linkPage, results chan<- linkPage) {
	// TODO maybe use chrome in the future for better SPA html rendering
	for p := range jobs {
		// Download HTML
		htmlBytes, err := getPageHTMLChrome(p.url)
		if err != nil {
			// TODO handle properly (this is a sucky way to deal with this)
			log.Println("Failed to GET")
			results <- linkPage{id: p.id,
				order: p.order,
				url:   p.url,
				html:  "<html><head></head><body>Failed</body></html>"}
			return
		}

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

func getPageHTMLGET(url string) ([]byte, error) {
	log.Print("Fetching ", url)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	html, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	return html, nil

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
}

func linkToID(i int, link string) string {
	h := fnv.New32a()
	h.Write([]byte(link))
	num := h.Sum32()
	return strconv.Itoa(i) + "-" + strconv.Itoa(int(num))
}
