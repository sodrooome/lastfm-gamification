.PHONY: serve format test

serve-dev:
	ENVIRONMENT=development uvicorn main:app --reload

serve-prod:
	ENVIRONMENT=production uvicorn main:app

format:
	black .

test:
	pytest tests/ -v