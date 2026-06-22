.PHONY: dev dev-backend dev-mobile build test deploy db-migrate db-seed clean

dev:
	@echo "Starting development servers..."
	$(MAKE) -j2 dev-backend dev-mobile

dev-backend:
	cd backend && npm run dev

dev-mobile:
	cd mobile && npx expo start

build:
	cd backend && npm run build

test:
	cd backend && npm test

deploy:
	docker compose up -d --build

db-migrate:
	cd backend && npx prisma migrate deploy

db-seed:
	cd backend && npm run prisma:seed

db-studio:
	cd backend && npx prisma studio

clean:
	docker compose down -v
	rm -rf backend/dist backend/node_modules mobile/node_modules

logs:
	docker compose logs -f backend

health:
	@curl -s http://localhost:4000/health | python3 -m json.tool 2>/dev/null || echo "Backend not running"
