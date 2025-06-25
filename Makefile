.PHONY: dev clean reclean remove-trailing-whitespace

dev:
	npx http-server weatherstar -c-1

remove-trailing-whitespace:
	find weatherstar -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" -o -name "*.json" -o -name "*.md" \) -exec sed -i '' 's/[[:space:]]*$$//' {} \;

clean: remove-trailing-whitespace
	npm run clean

reclean: clean dev
