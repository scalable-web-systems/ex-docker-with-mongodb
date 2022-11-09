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

app.get('/', (req: Request, res: Response) => {
  res.send({ message: 'ok' });
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

## Docker Compose With Service

Now, we need to extend our `docker-compose.yml` file with an entry for our NodeJS service. This is how we do it:

```yaml
version: '3.7'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - mongodb_container
    environment:
      DATABASE_URL: mongodb://root:rootpassword@mongodb_container:27017/mydb?directConnection=true&authSource=admin

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

We name our new service `app`. It will build a Docker image in the current directory where we placed our `Dockerfile`. We have it depend on the MongoDB server `mongodb_container`. We provide a `DATABASE_URL` environment variable for connecting to the database. We will access this environment variable inside of our service. The important things to note in this connection string is the hostname, which is `mongodb_container`, the port number, `27017`, and the database, `mydb`. The port number is the default MongoDB port number, so we could drop that if we want. We also include `authSource=admin`. This tells us that we are authenticating as an administrator. This is how the MongoDB image is arranged, so you need to include it to get access to the database and collection we created above.

At this point, you should be able to run `docker compose up` and access the service we wrote earlier easily by going to [http://localhost:3000](http://localhost:3000).

## Talking to MongoDB

Now, we are going to extend our service to communicate to the MongoDB database. The first thing we are going to do is write a function to connect and initialize a collection in our database. First, we need to important the `MongoClient` object from the `mongodb` package:

```typescript
import { MongoClient } from 'mongodb';
```

Here is the function:

```typescript
async function connectDB(): Promise<MongoClient> {
  const uri = process.env.DATABASE_URL;

  if (uri === undefined) {
    throw Error('DATABASE_URL environment variable is not specified');
  }

  const mongo = new MongoClient(uri);
  await mongo.connect();
  return await Promise.resolve(mongo);
}
```

This function returns a `Promise<MongoClient>` object. It is an asynchronous function that returns a value. Because it is an asynchronous function we need to return a `Promise` object that wraps our return value. The first line assigns the `DATABASE_URL` environment variable coming from the `docker-compose.yml` file. If the database URI is not defined we throw an exception. Otherwise, we create a new `MongoClient` giving it the `uri`. We attempt to connect. If the connection succeeds we return the `MongoClient` object wrapped inside of a promise.

Next, we need a function to initialize a database collection that we will be using as an example in this application. Here is the function:

```typescript
async function initDB(mongo: MongoClient) {
  const db = mongo.db();

  if (await db.listCollections({ name: 'products' }).hasNext()) {
    console.log('Collection already exists. Skipping initialization.');
    return;
  }

  const products = db.collection('products');
  const result = await products.insertMany([
    { kind: 'orange', count: 44 },
    { kind: 'banana', count: 33 },
    { kind: 'grapes', count: 19 },
  ]);

  console.log(`Initialized ${result.insertedCount} products`);
  console.log(`Initialized:`);

  for (let key in result.insertedIds) {
    console.log(`  Inserted product with ID ${result.insertedIds[key]}`);
  }
}
```

We pass to this function a `MongoClient` object so we can communicate to the database. First, we determine if the collection we care about already exists. To do this, we list the collections with a filter for a collection whose name is *products*. If it already exists, we simply print and return. Otherwise, we retrieve the collection using the `db.collection()` method and initialize the collection with `products.insertMany`. This method returns a result that includes some information about the insertion. Remember, in MongoDB, if you get a collection that doesn't exist, it will automatically create it for you.

We print some debugging output that includes the number of documents inserted into the collection. We then iterate over the inserted IDs that were created for each of the documents we inserted and print those out. All of this is to make sure that our calls did something.

Now we can implement a function that will return the products from the database. This function is straightforward:

```typescript
async function getProducts(mongo: MongoClient) {
  const products = mongo.db().collection('products');
  const result = products.find();

  const ret: { _id: string; kind: string; count: number }[] = [];

  await result.forEach((doc) => {
    ret.push({
      _id: doc._id.toHexString(),
      kind: doc.kind,
      count: doc.count,
    });
  });

  return ret;
}
```

Like the previous function, we pass in the `MongoClient` object. We grab the collection and call the `find()` method to retrieve all documents from the `products` collection. We then create an empty array called `ret` to copy the data from the result of the find. Note, we need to provide a type here not only to make it clear what we are going to be storing in this array, but also because the TypeScript compiler can't figure it out and produces an error if we remove this type annotation (try it). Next, we iterate over each document in the result and push new objects into the `ret` array containing the data retrieved from the database. Lastly, we return the list of the products.

Now we are going to create a new function called `start`. We will use this function to call the functions above, define an Express route, and run our Express server. The code for this function is:

```typescript
async function start() {
  const mongo = await connectDB();
  await initDB(mongo);

  app.get('/', async (req: Request, res: Response) => {
    try {
      const products = await getProducts(mongo);
      res.send(products);
    } catch (e) {
      console.log(e);
      res.status(404).send('Products not available');
    }
  });

  app.listen(port, () => {
    console.log(`Running on ${port}.`);
  });
}
```

This should be pretty straightforward. We connect to the database and then initialize it. We define a route that will get the products and return the products to the browser. Lastly, we listen on port 3000. This is the entire source for the service:

```typescript
import express, { Request, Response } from 'express';
import { MongoClient } from 'mongodb';

const app = express();
const port = 3000;

async function connectDB(): Promise<MongoClient> {
  const uri = process.env.DATABASE_URL;

  if (uri === undefined) {
    throw Error('DATABASE_URL environment variable is not specified');
  }

  const mongo = new MongoClient(uri);
  await mongo.connect();
  return await Promise.resolve(mongo);
}

async function initDB(mongo: MongoClient) {
  const db = mongo.db();

  if (await db.listCollections({ name: 'products' }).hasNext()) {
    console.log('Collection already exists. Skipping initialization.');
    return;
  }

  const products = db.collection('products');
  const result = await products.insertMany([
    { kind: 'orange', count: 44 },
    { kind: 'banana', count: 33 },
    { kind: 'grapes', count: 19 },
  ]);

  console.log(`Initialized ${result.insertedCount} products`);
  console.log(`Initialized:`);

  for (let key in result.insertedIds) {
    console.log(`  Inserted product with ID ${result.insertedIds[key]}`);
  }
}

async function getProducts(mongo: MongoClient) {
  const products = mongo.db().collection('products');
  const result = products.find();

  const ret: { _id: string; kind: string; count: number }[] = [];

  await result.forEach((doc) => {
    ret.push({
      _id: doc._id.toHexString(),
      kind: doc.kind,
      count: doc.count,
    });
  });

  return ret;
}

async function start() {
  const mongo = await connectDB();
  await initDB(mongo);

  app.get('/', async (req: Request, res: Response) => {
    try {
      const products = await getProducts(mongo);
      res.send(products);
    } catch (e) {
      console.log(e);
      res.status(404).send('Products not available');
    }
  });

  app.listen(port, () => {
    console.log(`Running on ${port}.`);
  });
}

start();
```

Note, we call `start()` at the end.

## Docker Composing it All

Now that we have everything set, we can run `docker compose up` and connecting to [http://localhost:3000](http://localhost:3000) should display the list of products stored in the database.

You may also be interested in running docker compose through VSCode. To do that you need to have the [Docker extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker) installed. Once you have this extension installed, you can right-click on the `docker-compose.yml` file and select **Compose Up**.

![](img/2022-11-09-14-26-41.png)

This will bring up the system and allow you to connect to it as well. You can also right-click on the `docker-compose.yml` file and select **Compose Down** to bring the containers down.