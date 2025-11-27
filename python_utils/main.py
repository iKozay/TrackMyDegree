from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
import uvicorn
from parser.transcript_parser import parse_transcript
from scraper.degree_data_scraper import scrape_degree

app = FastAPI(title="TrackMyDegree Python Utils API", version="0.0.1")

@app.post("/parse-transcript")
async def parse_transcript_api(file: UploadFile = File(...)):
	if not file.filename.lower().endswith(".pdf"):
		raise HTTPException(status_code=400, detail="Uploaded file must be a PDF")

	try:
		pdf_bytes = await file.read()
		parsed_data = parse_transcript(pdf_bytes)
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Error parsing transcript: {str(e)}")
	
	return JSONResponse({"parsed_data": parsed_data}, status_code=200)

@app.get("/scrape-degree")
async def scrape_degree_api(url: str = Query(..., description="Degree requirements URL")):
	try:
		degree_data = scrape_degree(url)
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Error scraping degree data: {str(e)}")

	return JSONResponse(degree_data, status_code=200)

if __name__ == "__main__":
	uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
