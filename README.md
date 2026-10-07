# Peloteros San Antonio FC

Aplicación web full-stack para gestionar peloteros y comprobantes de pago del club.

## Stack
- Next.js 15 + React + TypeScript
- CSS responsive propio, sin dependencia de un framework visual
- PostgreSQL + Prisma
- Supabase Storage para vouchers
- Autenticación administrativa con sesión JWT en cookie HttpOnly
- Zod + validación server-side

## Requisitos
Node.js 20.9+, PostgreSQL (recomendado Supabase) y un bucket privado de Supabase Storage.

## Instalación
```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

## Variables de entorno
`DATABASE_URL` y `DIRECT_URL`: conexión PostgreSQL. `AUTH_SECRET`: secreto largo aleatorio. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`: almacenamiento privado de vouchers. `ADMIN_EMAIL` y `ADMIN_PASSWORD`: cuenta inicial del seed. `NEXT_PUBLIC_APP_URL`: URL pública.

## Supabase Storage
Crea un bucket privado llamado `vouchers`. La app sube los archivos mediante service role y genera URLs firmadas; la service role key nunca debe exponerse al navegador.

## Administrador
El seed crea/actualiza el administrador indicado por `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Cambia ambas variables antes de producción.

## Verificación
```bash
npm run lint
npm run typecheck
npm run build
```

## Git y despliegue
```bash
git init
git add .
git commit -m "feat: initial Peloteros San Antonio FC app"
git branch -M main
git remote add origin <TU_REPOSITORIO>
git push -u origin main
```

Para Vercel: conecta el repositorio, configura las variables de entorno y despliega. Para PostgreSQL/Supabase ejecuta las migraciones contra la base de producción. Configura el bucket privado antes de aceptar pagos.

## Rutas
- `/` inicio
- `/peloteros` jugadores activos
- `/pagos` registro público de pagos
- `/admin` dashboard protegido
- `/admin/login` acceso administrativo
- `/reportes` reportes protegidos

## Notas de seguridad
Los vouchers no se guardan en PostgreSQL; sólo se guarda metadata y URL firmada. Los archivos tienen límite de 5 MB y MIME permitido. Las rutas administrativas validan sesión también en servidor. No subas `.env`, vouchers reales ni credenciales al repositorio.
