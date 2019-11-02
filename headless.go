package main

import (
	"context"
	"log"
	"time"

	"github.com/mafredri/cdp"
	"github.com/mafredri/cdp/devtool"
	"github.com/mafredri/cdp/protocol/dom"
	"github.com/mafredri/cdp/protocol/page"
	"github.com/mafredri/cdp/rpcc"
)

// TODO the extent to which I should keep resources alive for optimization
// is unclear to me
func getPageHTMLChrome(url string) ([]byte, error) {
	// Constants and parameters
	timeout := 20 * time.Second
	chromeURL := "http://127.0.0.1:9222"
	bufSize := 100000000 // 100 MB

	// Context to carry throughout
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// Use the DevTools HTTP/JSON API to manage targets (e.g. pages, webworkers).
	devt := devtool.New(chromeURL)
	pt, err := devt.Get(ctx, devtool.Page)
	if err != nil {
		pt, err = devt.Create(ctx)
		if err != nil {
			return nil, err
		}
	}

	// Initiate a new RPC connection to the Chrome DevTools Protocol target.
	conn, err := rpcc.DialContext(ctx, pt.WebSocketDebuggerURL, rpcc.WithWriteBufferSize(bufSize))
	if err != nil {
		return nil, err
	}
	defer conn.Close() // Leaving connections open will leak memory.

	c := cdp.NewClient(conn)

	// Open a DOMContentEventFired client to buffer this event.
	domContent, err := c.Page.DOMContentEventFired(ctx)
	if err != nil {
		return nil, err
	}
	defer domContent.Close()

	// Enable events on the Page domain, it's often preferrable to create
	// event clients before enabling events so that we don't miss any.
	if err = c.Page.Enable(ctx); err != nil {
		return nil, err
	}

	// Create the Navigate arguments with the optional Referrer field set.
	navArgs := page.NewNavigateArgs(url).SetReferrer("https://duckduckgo.com")
	_, err = c.Page.Navigate(ctx, navArgs)
	if err != nil {
		return nil, err
	}

	log.Print("Navigated to ", url)

	// Wait until we have a DOMContentEventFired event.
	if _, err = domContent.Recv(); err != nil {
		return nil, err
	}

	// Fetch the document root node. We can pass nil here
	// since this method only takes optional arguments.
	doc, err := c.DOM.GetDocument(ctx, nil)
	if err != nil {
		return nil, err
	}

	htmlReply, err := c.DOM.GetOuterHTML(ctx, &dom.GetOuterHTMLArgs{
		NodeID: &doc.Root.NodeID,
	})
	if err != nil {
		return nil, err
	}

	return []byte(htmlReply.OuterHTML), nil
}

func buildPDFChrome(html []byte) ([]byte, error) {
	// Constants and parameters
	timeout := 120 * time.Second
	chromeURL := "http://127.0.0.1:9222"
	bufSize := 100000000 // 100 MB

	// Context to carry throughout
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// Use the DevTools HTTP/JSON API to manage targets (e.g. pages, webworkers).
	devt := devtool.New(chromeURL)
	pt, err := devt.Get(ctx, devtool.Page)
	if err != nil {
		pt, err = devt.Create(ctx)
		if err != nil {
			return nil, err
		}
	}

	// Initiate a new RPC connection to the Chrome DevTools Protocol target.
	conn, err := rpcc.DialContext(ctx, pt.WebSocketDebuggerURL, rpcc.WithWriteBufferSize(bufSize))
	if err != nil {
		return nil, err
	}
	defer conn.Close() // Leaving connections open will leak memory.

	c := cdp.NewClient(conn)

	// Fetch the document root node. We can pass nil here
	// since this method only takes optional arguments.
	doc, err := c.DOM.GetDocument(ctx, nil)
	if err != nil {
		return nil, err
	}

	c.DOM.SetOuterHTML(ctx, &dom.SetOuterHTMLArgs{
		NodeID:    doc.Root.NodeID,
		OuterHTML: string(html),
	})

	printToPDFArgs := page.NewPrintToPDFArgs().
		SetLandscape(true).
		SetPrintBackground(true).
		SetMarginTop(0).
		SetMarginBottom(0).
		SetMarginLeft(0).
		SetMarginRight(0).
		SetPrintBackground(true)
	pdf, err := c.Page.PrintToPDF(ctx, printToPDFArgs)
	if err != nil {
		return nil, err
	}

	return pdf.Data, nil
}
