FROM node:22-alpine

WORKDIR /worker
COPY package.json ./
COPY src ./src

# El proceso de producción se añadirá al conectar una cola y un proveedor de ejecución aislada.
CMD ["node", "--experimental-strip-types", "src/index.ts"]
