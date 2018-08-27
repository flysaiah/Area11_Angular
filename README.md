# Area11

Area 11 is a web application for keeping track of anime you have watched or are planning on / considering watching, as well as providing a platform for picking new anime. It also serves as a pseudo-social app where you can form groups with other people and do thinks like rank shows and view/compare each other's catalogs.

## Local Setup

1. Start by cloning the project with `git clone https://github.com/flysaiah/Area11.git`

2. Install libraries by running this in the root project directory: `npm install .`

3. Ensure that you have mongodb installed: https://docs.mongodb.com/manual/installation/

4. Start a MongoDB server with `mongod`

5. Build the project with `ng build`. Use the --prod` flag for a production build.

6. Start the local server with `nodemon server.js`.

Now navigate to `localhost:3000` and your application should be running!
