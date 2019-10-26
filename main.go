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
		http.Error(w, err.Error(), 500)
	}
	tmpl.Execute(w, nil)
}

func handleAPI(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		log.Println("Endpoint only accepts POSTs")
		http.Error(w, "Endpoint only accepts POSTs", 500)
		return
	}
	_50k := int64((1 << 10) * 50)
	err := r.ParseMultipartForm(_50k)
	if err != nil {
		log.Println(err.Error())
		http.Error(w, err.Error(), 500)
		return
	}
	log.Println(r.MultipartForm.Value["From"][0])

}
