const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SEC);
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());


app.get('/', async (req, res) => {
    res.send('iConnect Server')
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mqmhnff.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


const varifyJwt = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.send('unauthorized')
    };
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.send([{ message: 'forbidden access' }]);
        };
        req.decoded = decoded;
        next();
    });
};

const run = async () => {
    try {
        const usersCollection = client.db('iconnect').collection('users');
        const catagoriesCollection = client.db('iconnect').collection('catagories');
        const productsCollection = client.db('iconnect').collection('products');
        const advertisesCollection = client.db('iconnect').collection('advertises');
        const bookedProductsCollection = client.db('iconnect').collection('bookedProducts');
        const reportedProductCollection = client.db('iconnect').collection('reportedProducts');



        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email,
            };
            const user = await usersCollection.findOne(query);

            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN);
                return res.send({ accessToken: token });
            };
            res.send({ accessToken: '' });
        });

        app.get('/user', varifyJwt, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.send([{ message: 'forbidden access' }])
            }

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send(user);
        });

        app.get('/catagories', async (req, res) => {
            const catagories = await catagoriesCollection.find({}).toArray();
            res.send(catagories);
        });

        app.get('/products/:catagoryId', async (req, res) => {
            const catagoryId = req.params.catagoryId;
            const query = { catagoryId: catagoryId, isAvaiable: true };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });

        app.get('/buyers', varifyJwt, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.send([{ message: 'forbidden access' }])
            }
            const admin = await usersCollection.findOne({ email: email });
            if (admin.accountType === "admin") {
                const query = { accountType: 'buyer' };
                const buyers = await usersCollection.find(query).toArray();
                return res.send(buyers);
            }
            res.send([]);
        });

        app.get('/sellers', varifyJwt, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.send([{ message: 'forbidden access' }])
            }
            const admin = await usersCollection.findOne({ email: email });
            if (admin.accountType === "admin") {
                const query = { accountType: 'seller' };
                const buyers = await usersCollection.find(query).toArray();
                return res.send(buyers);
            }
            res.send([]);
        });
        app.get('/myorders', varifyJwt, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.send([{ message: 'forbidden access' }])
            }
            const buyer = await usersCollection.findOne({ email: email });
            if (buyer.accountType === "buyer") {
                const query = { bookedByEmail: email };
                const myOrders = await bookedProductsCollection.find(query).toArray();
                return res.send(myOrders);
            }
            res.send([]);
        });

        app.get('/myproducts', varifyJwt, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.send([{ message: 'forbidden access' }])
            }
            const seller = await usersCollection.findOne({ email: email });
            if (seller.accountType === "seller") {
                const query = { sellerEmail: email };
                const myProducts = await productsCollection.find(query).toArray();
                return res.send(myProducts);
            };
            res.send([]);
        });

        app.get('/report', varifyJwt, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.send([{ message: 'forbidden access' }])
            }
            const admin = await usersCollection.findOne({ email: email });
            if (admin.accountType === "admin") {
                const myProducts = await reportedProductCollection.find({}).toArray();
                return res.send(myProducts);
            };
            res.send([]);
        });

        app.get('/booking', async (req, res) => {
            const id = req.query.id;
            const booking = await bookedProductsCollection.findOne({ _id: id });
            res.send(booking);
        });

        app.get('/advertise', async (req, res) => {
            const products = await advertisesCollection.find({}).toArray();
            res.send(products)
        });

        app.post('/users', async (req, res) => {
            const user = req.body;

            const query = { email: user.email };

            const alreadyHave = await usersCollection.findOne(query);

            if (alreadyHave) {
                return res.send(alreadyHave);
            };

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.post('/advertise', async (req, res) => {
            const product = req.body;
            const query = { _id: product._id };
            const alreadyAd = await advertisesCollection.findOne(query);
            if (alreadyAd) {
                return res.send({ acknowledged: false })
            }
            const result = await advertisesCollection.insertOne(product);
            res.send(result);
        });


        app.post('/product', async (req, res) => {
            const email = req.body.sellerEmail;

            const user = await usersCollection.findOne({ email: email });
            if (user.accountType === 'seller') {
                const product = req.body;
                const result = await productsCollection.insertOne(product);
                return res.send(result);
            }
            res.send({ message: 'Not a seller' })
        });

        app.post('/booking', async (req, res) => {
            const product = req.body;



            const alreadyBooked = await bookedProductsCollection.findOne({ _id: product._id });

            const q = { _id: product._id };
            const ad = await advertisesCollection.findOne(q);
            if (ad) {
                const r = advertisesCollection.deleteOne(q);
            };

            if (alreadyBooked) {
                res.send({ acknowledged: false })
            } else {
                const result = await bookedProductsCollection.insertOne(product);
                res.send(result);
            };
        });

        app.post('/report', async (req, res) => {
            const product = req.body;
            const alreadyReport = await reportedProductCollection.findOne({ _id: product._id });
            if (alreadyReport) {
                res.send({})
            } else {
                const result = await reportedProductCollection.insertOne(product);
                res.send(result);
            };

        });

        app.post('/create-payment-intent', async (req, res) => {
            const product = req.body;
            const price = product.resellPrice;
            const ammount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: ammount,
                currency: "usd",
                "payment_method_types": [
                    "card"
                ],
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.delete('/user', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        });

        app.delete('/product', async (req, res) => {
            const id = req.query.id;

            const q = { _id: id };
            const ad = await advertisesCollection.findOne(q);
            if (ad) {
                const r = advertisesCollection.deleteOne(q);
            };

            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);

            res.send(result);

        });
        app.delete('/report', async (req, res) => {
            const id = req.query.id;
            const query = { _id: id };
            const result = await reportedProductCollection.deleteOne(query);

            res.send(result);

        });

        app.put('/user', async (req, res) => {
            const user = req.body;
            const email = user.email;
            const filter = { email: email };
            const option = { upsert: true };
            const updatedUser = {
                $set: {
                    isVarified: user.isVarified,
                }
            };
            const result = await usersCollection.updateOne(filter, updatedUser, option);
            res.send(result);

        });

        app.put('/product', async (req, res) => {
            const product = req.body;
            const id = product._id;
            const filter = { _id: ObjectId(id) };
            const option = { upsert: true };
            const updateProduct = {
                $set: {
                    isAvaiable: product.isAvaiable,
                }
            };
            const result = await productsCollection.updateOne(filter, updateProduct, option);
            res.send(result);

        });

        app.put('/booking', async (req, res) => {
            const product = req.body;
            const id = product._id;
            const filter = { _id: id };
            const option = { upsert: true };
            const updateProduct = {
                $set: {
                    paid: product.paid,
                    transitonID: product.transitonID,
                }
            };
            const result = await bookedProductsCollection.updateOne(filter, updateProduct, option);
            res.send(result);

        });





















    }
    finally {

    }
};

run().catch(err => console.log(err));

app.listen(port, () => {
    console.log(`Server Running on Port ${port}`);
});