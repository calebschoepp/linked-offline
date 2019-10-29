package main

import (
	"io"
	"log"

	"github.com/PuerkitoBio/goquery"
)

type page struct {
	order int
	url   string
	id    string
	html  string
}

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

func generate(baseHTML io.Reader) {
	// TODO do I want log fatal here or just bubble up error?
	// Build goquery document
	doc, err := goquery.NewDocumentFromReader(baseHTML)
	if err != nil {
		log.Fatal(err)
	}

	var pages []page

	// Build selection of every link and iterate over it
	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		// For each link...
		// Add link to list of links
		link, ok := s.Attr("href")
		if !ok {
			// TODO handle error intelligently
		}

		append(pages, link)

		// Set the link

	})

}
