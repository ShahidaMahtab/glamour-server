const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.072tx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();
    const database = client.db("glamour_shop");
    const productsCollection = database.collection("products");
    const ordersCollection = database.collection("orders");
    const reviewsCollection = database.collection("reviews");
    const usersCollection = database.collection("users");

    //GET products
    app.get("/products", async (req, res) => {
      const cursor = productsCollection.find({});
      const products = await cursor.toArray();
      res.json(products);
    });

    //Post Order
    app.post("/order", async (req, res) => {
      const orders = req.body;
      const result = await ordersCollection.insertOne(orders);

      res.json(result);
    });

    //Get Order
    app.get("/order", async (req, res) => {
      const email = req.query.email;
      const query = { email };
      const cursor = ordersCollection.find(query);
      const result = await cursor.toArray();
      res.json(result);
    });
    //Get Order Item Array
    app.get("/viewOrders", async (req, res) => {
      const email = req.query.email;
      const query = { email };
      const cursor = ordersCollection.find(query);
      const result = await cursor.toArray();

      res.json(result);
    });

    //delete multiple orders
    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.json(result);
    });

    app.put("/singleOrder", async (req, res) => {
      const id = req.query.orderId;
      const pid = req.query.productId;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };

      const updateDoc = {
        $pull: { orderItems: { item_id: pid } },
      };
      const result = await ordersCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      res.json(result);
    });

    //GET Reviews
    app.get("/reviews", async (req, res) => {
      const cursor = reviewsCollection.find({});
      const reviews = await cursor.toArray();
      res.json(reviews);
    });

    //POST users
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });

    //PUT users
    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });

    //PUT ADMIN
    app.put("/admin/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const updateDoc = { $set: { role: "admin" } };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.json(result);
    });

    //secure admin
    app.get("/admin/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      let isAdmin = false;
      const user = await usersCollection.findOne(query);
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    //UPDATE Status
    app.put("/admin/allorders/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: "shipping",
        },
      };
      const result = await ordersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });

    //GET Payment
    app.get("/payments/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.findOne(query);
      // console.log(result);
      res.json(result);
    });

    //stripe
    app.post("/create-payment-intent", async (req, res) => {
      const paymentInfo = req.body;
      const amount = paymentInfo.grandTotal * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    });
    app.put("/payments/:id", async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          payment: payment,
        },
      };
      const result = await ordersCollection.updateOne(filter, updateDoc);
      res.json(result);
    });

    //GET allOrders
    app.get("/allorders", async (req, res) => {
      const cursor = ordersCollection.find({});
      const orders = await cursor.toArray();
      res.json(orders);
    });

    //POST newProducts
    app.post("/addproducts", async (req, res) => {
      const products = req.body;
      const result = await productsCollection.insertOne(products);

      res.json(result);
    });

    //POST Reviews
    app.post("/reviews", async (req, res) => {
      const reviews = req.body;
      const result = await reviewsCollection.insertOne(reviews);
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", function (req, res) {
  res.send("Glamour Server");
});
app.listen(port, () => {
  console.log("listening to port", port);
});
