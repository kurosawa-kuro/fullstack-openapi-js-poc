# 開発者フレンドリーなコマンド
setup:
	./scripts/setup.sh

dev:
	npm run dev

test:
	npm run test:watch

api-docs:
	open http://localhost:3000/api-docs

generate-resource:
	@read -p "Enter resource name: " name; \
	node scripts/generate-resource.js $$name

clean:
	rm -rf node_modules db/db.json
	npm install