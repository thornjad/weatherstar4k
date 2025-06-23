.PHONY: dev clean reclean

dev:
	npx http-server weatherstar -c-1

clean:
	npm run clean

reclean: clean dev
