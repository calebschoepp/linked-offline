package main

import (
	"html/template"
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/", handleIndex)
	http.HandleFunc("/api/", handleAPI)
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleIndex(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("index.html")
	if err != nil {
		log.Println(err.Error())
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	tmpl.Execute(w, nil)
}

func handleAPI(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		log.Println("Endpoint only accepts POSTs")
		http.Error(w, "Endpoint only accepts POSTs", http.StatusInternalServerError)
		return
	}

	// TODO possibly inefficient max memory
	_100k := int64((1 << 10) * 100)
	err := r.ParseMultipartForm(_100k)
	if err != nil {
		log.Println(err.Error())
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	htmlStrings, ok := r.MultipartForm.Value["stripped-html"]
	if !ok {
		http.Error(w, "No stripped-html in email POST", http.StatusInternalServerError)
	}

	log.Println("POST received -- Generating PDF")
	generate(htmlStrings[0])
	w.WriteHeader(http.StatusCreated)
}
