.PHONY: dev check

dev:
	npx http-server weatherstar -c-1

check:
	npm run clean
