import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set('view engine', 'ejs');

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "toolCrib",
    password: "1234",
    port: 5432,
});
db.connect();

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

app.get("/addItem", async (req, res) => {
    try {
        const result = await db.query("SELECT DISTINCT storage_location FROM tools");
        let locn = result.rows;
        res.render("addItem.ejs", { locn });
    } catch (err) {
        console.log(err);
    }
});

app.post("/checkout", async (req, res) => {
    let checkID = req.body.chkotid;
    try {
        const result = await db.query("SELECT * FROM tools WHERE id = $1", [checkID]);
        let fitems = result.rows;
        if (fitems.length === 0) {
            console.log(`No items found with id: ${checkID}`);
            res.status(404).send(`No items found with id: ${checkID}`);
        } else {
            res.render("checkout.ejs", { chck: fitems[0] });
        }
    } catch (err) {
        console.error("Database query error:", err);
        res.status(500).send("An error occurred while fetching the data.");
    }
});

app.post("/edit", async (req, res) => {
    let reqID = req.body.inputid;
    try {
        const result = await db.query("SELECT * FROM tools WHERE id = $1", [reqID]);
        let fitems = result.rows;
        if (fitems.length === 0) {
            console.log(`No items found with id: ${reqID}`);
            res.status(404).send(`No items found with id: ${reqID}`);
        } else {
            console.log(fitems);
            res.render("edit.ejs", { kitems: fitems[0], successMessage: null });
        }
    } catch (err) {
        console.error("Database query error:", err);
        res.status(500).send("An error occurred while fetching the data.");
    }
});

app.post('/search', async (req, res) => {
    const query = req.body.shrch.toLowerCase();
    try {
        const result = await db.query('SELECT * FROM tools WHERE LOWER(iname) LIKE $1', [`%${query}%`]);
        let items = result.rows;
        const mss = items.length === 0;
        res.render("index.ejs", { items, mss });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.post("/update", async (req, res) => {
    const { updName, updLocn, updQty, updEmp } = req.body;
    try {
        await db.query(
            "UPDATE tools SET iname = $1, storage_location = $2, itm_qty = $3, emp_id = $4 WHERE id = $5",
            [updName, updLocn, updQty, updEmp, req.body.inputid]
        );
        res.render("edit.ejs", { kitems: req.body, successMessage: "Item updated successfully!" });
    } catch (err) {
        console.error("Database update error:", err);
        res.status(500).send("An error occurred while updating the data.");
    }
});

app.get("/", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM tools ORDER BY id DESC");
        let items = result.rows;
        res.render("index.ejs", { items, mss: false });
    } catch (err) {
        console.log(err);
    }
});

app.get("/cOut", (req, res) => {
    res.render("./addItem.ejs");
});

app.post("/add", async (req, res) => {
    const itmName = req.body.itmName;
    let strLocn = req.body.storagelocation;
    if (req.body.storagelocation == "other") {
        strLocn = req.body.otherStorage;
    }
    let emplId = req.body.empId;
    let qty = req.body.itmQuan;
    try {
        await db.query("INSERT INTO tools (iname, storage_location, emp_id, itm_qty) VALUES ($1, $2, $3, $4)", [itmName, strLocn, emplId, qty]);
        res.redirect("/");
    } catch (err) {
        console.log(err);
    }
});

app.post("/chkIten", async (req, res) => {
    let ks;
    console.log("Reached the checkout menu " + req.body.fname);
    try {
        const result = await db.query("SELECT * FROM tools WHERE id = $1", [req.body.itmCross]);
        ks = result.rows;
    } catch (err) {
        console.error(err);
    }
    if (ks[0].itm_qty < req.body.chkQty) {
        console.log("Error: Not enough quantity");
    } else {
        let bal = ks[0].itm_qty - req.body.chkQty;
        try {
            await db.query("INSERT INTO checked_out_items (item_id, item_name, usage_location, checked_out_by, first_name, last_name, quantity_in_use) VALUES ($1, $2, $3, $4, $5, $6, $7)", [req.body.itmCross, ks[0].iname, req.body.chkLocn, req.body.eIds, req.body.fname, req.body.lname, req.body.chkQty]);
            await db.query("UPDATE tools SET itm_qty = $1 WHERE id = $2", [bal, req.body.itmCross]);
            res.redirect("/");
        } catch (err) {
            console.log("Error occurred while checking out the item: " + err);
        }
    }
});


app.get('/exportex', (req, res) => {
  res.render('./exportex.ejs'); // Ensure you have an about.ejs file in your views directory
});