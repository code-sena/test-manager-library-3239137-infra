# test-manager-library-3239137-infra

Contenedores, red, volúmenes y el motor de base de datos **vacío** de
*Manager Library*.

## Qué hay aquí y qué no

| Sí | No |
|---|---|
| `docker-compose.yml`: motor, API y frontend | Ni un `CREATE TABLE` |
| Red y volúmenes con nombre | Semillas en SQL |
| Las variables de entorno de todos los servicios | Credenciales reales |

El esquema **no se define aquí**. El motor arranca sin tablas y las crean las
migraciones de la API al levantar (artículo V, ADR-001). Se puede comprobar:

```bash
grep -ri "create table" .    # no devuelve nada
```

## Los seis repositorios, lado a lado

El compose construye la API y el frontend desde sus repositorios hermanos, así
que los forks van clonados en la misma carpeta:

```
repositorios/
├── test-manager-library-3239137-api
├── test-manager-library-3239137-app
├── test-manager-library-3239137-docs
├── test-manager-library-3239137-infra   <- se levanta desde aquí
├── test-manager-library-3239137-page
└── test-manager-library-3239137-tool
```

## Un solo comando

```bash
cp .env.example .env          # rellenar DB_PASSWORD, JWT_SECRET y ADMIN_PASSWORD
docker compose up --build
```

Al terminar:

| Servicio | Dónde | Qué es |
|---|---|---|
| API | http://localhost:8000/api/v1/health | `{"status":"ok"}` |
| Frontend | http://localhost:5173 | Pantallas de operación |
| Motor | `localhost:5432` | PostgreSQL 16, esquema `library` |

El arranque de la API, en este orden: espera a que el motor acepte conexiones,
corre las migraciones y crea el administrador inicial desde el entorno.

## Comprobar que la base llegó vacía

```bash
docker compose up -d db
docker compose exec db psql -U library -d library -c "\dt library.*"
# "Did not find any relation named library.*" : correcto, el motor está vacío
docker compose up -d api
docker compose exec db psql -U library -d library -c "\dt library.*"
# ahora sí: las seis tablas, creadas por las migraciones
```

## Las consultas de data-model §10

Para comprobar que el documento de datos no miente:

```bash
docker compose exec db psql -U library -d library -c "select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'library' order by table_name, ordinal_position"
docker compose exec db psql -U library -d library -c "select conrelid::regclass, conname, contype, pg_get_constraintdef(oid) from pg_constraint where connamespace = 'library'::regnamespace order by 1, 3, 2"
docker compose exec db psql -U library -d library -c "select tablename, indexname, indexdef from pg_indexes where schemaname = 'library' order by 1, 2"
```

Ninguna columna debe traer `column_default`.

## Pruebas del backend dentro del contenedor

```bash
docker compose exec api vendor/bin/phpunit
```

## Apagar

```bash
docker compose down        # conserva los datos
docker compose down -v     # borra el volumen: la base vuelve a arrancar vacía
```
