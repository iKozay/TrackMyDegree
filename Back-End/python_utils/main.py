from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
import uvicorn
from parser.transcript_parser import parse_transcript
from scraper.degree_data_scraper import DegreeDataScraper
import sys

app = FastAPI(title="TrackMyDegree Python Utils API", version="0.0.1")

@app.post("/parse-transcript")
async def parse_transcript_api(file: UploadFile = File(...)):
	if not file.filename.lower().endswith(".pdf"):
		raise HTTPException(status_code=400, detail="Uploaded file must be a PDF")

	try:
		pdf_bytes = await file.read()
		parsed_data = await run_in_threadpool(parse_transcript, pdf_bytes)
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Error parsing transcript: {str(e)}")
	
	return parsed_data

@app.get("/scrape-degree")
async def scrape_degree_api(url: str = Query(..., description="Degree requirements URL")):
	try:
		scraper = DegreeDataScraper()
		degree_data = await run_in_threadpool(scraper.scrape_degree, url)
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Error scraping degree data: {str(e)}")
	return degree_data

def main():
	# Check if running in development (--dev) or production (add nothing)
	if "--dev" in sys.argv:
		# Single worker with reload for development
		uvicorn.run("main:app", host="0.0.0.0", port=15001, reload=True)
	else:
		# Production with multiple workers
		uvicorn.run("main:app", host="0.0.0.0", port=15001, workers=8)

if __name__ == "__main__":
	main()