# Docker with MongoDB

This example demonstrates how to create a simple service using Express, MongoDB, and Docker.

## Setup

First, we need to create a new folder:

```bash
mkdir ex-docker-with-mongodb
cd ex-docker-with-mongodb
```

Second, we initialize an npm environment:

```bash
npm init -y
```

Next, we install the necessary tools and libraries:

```bash
npm install typescript --save-dev
npm install @types/node --save-dev
npm install @types/express --save-dev
npm install nodemon --save-dev
npm install ts-node --save-dev
npm install express --save
npm install mongodb --save
```

Generate the TypeScript config file `tsconfig.json`:

```bash
npx tsc --init
```

Open the `tsconfig.json` file, and make sure it looks like this:

```json
{
  "compilerOptions": {
    "target": "es5",                          
    "module": "commonjs",                    
    "lib": ["es6"],                     
    "allowJs": true,
    "outDir": "build",                          
    "rootDir": "src",
    "strict": true,         
    "noImplicitAny": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  }
}
```

Now, create a directory for our TypeScript source files and add our first TypeScript file:

```bash
mkdir src
touch src/index.ts
```

Open `index.ts`, and add the following:

```typescript
console.log('Hello World');
```

We can then easily compile this with this command:

```bash
npx tsc
```

This will generate the compiled JavaScript file into `build/index.js` and contain the following contents:

```js
"use strict";
console.log('Hello World');
```

It would be great if we could automatically compile the project each time we saved our TypeScript file. We can. In VSCode type `Command+Shift+B` (Mac) or `Ctrl+Shift+B` (Windows/Linux) and select `tsc: watch - tsconfig.json`. Now every time you save it will re-compile your code. 😃.

## Simple Service

Let's create a simple service in TypeScript without MongoDB support:

```ts
import express, { Request, Response } from 'express';

const app = express();
const port = 3000;

interface Message {
  message: string
}

app.get('/', (req: Request, res: Response) => {
  const msg: Message = { 'message': 'ok' };
  res.send(msg);
});

app.listen(port, () => {
  console.log(`Running on ${port}.`);
});
```

To make things easier, let us create a script in `package.json` that will allow us to run our service:

```json
  "start": "node build/index.js"
```

Remember, we are automatically compiling the TypeScript to JavaScript using VSCode. If we want to not rely on VSCode, we can also add a build script:

```json
  "build": "tsc"
```

Now, we can build and run our service from the command line:

```bash
npm run build
npm start
```

You will see the following output:

```bash
> ex-docker-with-mongodb@1.0.0 start
> node build/index.js

Running on 3000.
```

## Dockerfile

Now that we have a simple service, we want to run it inside of a Docker container. To do that, we create the a new file in the root directory called `Dockerfile` with the following contents:

```dockerfile
FROM node

WORKDIR /usr/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

CMD [ "npm", "start" ]
```

We will also add a `.dockerignore` file to ignore files and directories from being add to the docker image. The contents of this file is:

```bash
node_modules
npm-debug.log
```

Now, we can build and run the image:

```bash
docker build -t ex-docker-with-mongodb-image .
docker run --rm --name ex-service ex-docker-with-mongodb-image
```

You will see this output:

```bash
> ex-docker-with-mongodb@1.0.0 start
> node build/index.js

Running on 3000.
```

To stop the docker container, open another terminal and type the following:

```bash
docker stop ex-service
```

## Docker Compose and MongoDB

Now that we have a working service, we can start building up this example project. First, let us create a `docker-compose.yml` file to create the MongoDB service:

```yaml
version: '3.8'
services:
  mongodb_container:
    image: mongo:latest
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: rootpassword
    volumes:
      - mongodb_data_container:/data/db

volumes:
  mongodb_data_container:
```

In brief, this creates a new service called `mongodb_container` using the latest MongoDB image from DockerHub. It also sets the root username and password for the database. We also want to be able to persist the data stored in the database. MongoDB stores data in the `/data/db` folder. So, we map a local volume on the host machine that we are calling `mongodb_data_container` to the `/data/db` directory inside of the container. Now, anything written to the `/data/db` directory will actually be written to our local host machines drive. We bring up this service very easily:

```bash
docker compose up -d
```

This will bring up the service in the background. We can then connect to the running instance to play with the database. First, find out the name of the container by running `docker ps`. The container it created for me is named `ex-docker-with-mongodb-mongodb_container-1`. Now, we can connect to it:

```bash
docker exec -it ex-docker-with-mongodb-mongodb_container-1 bash
```

This should bring up a prompt that looks like this:

```bash
root@e0b4c93122c7:/#
```

Now, we can connect to the running MongoDB database:

```bash
mongosh admin -u root -p rootpassword
```

Now, we get a mongo shell prompt:

```bash
admin>
```

We can create a new database by using it:

```
admin> use mydb
mydb>
```

Now, create some data for our example database:

```bash
mydb> db.products.insertOne({ item: "card", qty: 15 })
{
  acknowledged: true,
  insertedId: ObjectId("636ac878b78bca4e87e6e9cd")
}
```

Your `ObjectId` will likely be different from this one.

Ok, now that we have the database all set, we can `ctrl+D` our way out of the mongo shell and the container to get back to our host system.

Great! We have a running database. 👍

## Docker Compose Express

Now, we need to extend our `docker-compose.yml` file with an entry for our NodeJS service. This is how we do it:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - mongodb_container
    environment:
      DATABASE_URL: mongodb://root:rootpassword@mongodb_container:27017/mydb
  mongodb_container:
    image: mongo:latest
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: rootpassword
    volumes:
      - mongodb_data_container:/data/db

volumes:
  mongodb_data_container:
```

Look at this: https://www.mongodb.com/blog/post/quick-start-nodejs-mongodb-how-to-get-connected-to-your-database