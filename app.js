const http = require("http");
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const url = "mongodb://127.0.0.1:27017";
const client = new MongoClient(url);

async function startServer() {
    await client.connect();
    console.log("MongoDB connected");

    const db = client.db("registrationDB");
    const users = db.collection("users");

    const server = http.createServer(function (req, res) {

        // Display the home page
        if (req.url === "/" && req.method === "GET") {
            res.writeHead(200, {
                "Content-Type": "text/html"
            });

            fs.createReadStream(
                path.join(__dirname, "home.html")
            ).pipe(res);
        }

        // Receive the submitted form
        else if (req.url === "/server" &&
                 req.method === "POST") {

            let rawData = "";

            req.on("data", function (chunk) {
                rawData += chunk;
            });

            req.on("end", async function () {
                try {
                    const formData = new URLSearchParams(rawData);

                    const user = {
                        name: formData.get("name"),
                        password: formData.get("password"),
                        age: Number(formData.get("age")),
                        mobile: formData.get("mobile"),
                        email: formData.get("email"),
                        gender: formData.get("gender"),
                        state: formData.get("state"),
                        skills: formData.get("skills")
                    };

                    // Check that all fields are present
                    if (Object.values(user).some(
                        value => value === null ||
                        value === undefined ||
                        value === "" ||
                        (typeof value === "number" &&
                         !Number.isFinite(value))
                    )) {
                        res.writeHead(400, {
                            "Content-Type": "text/plain"
                        });
                        res.end("Please enter all valid details.");
                        return;
                    }

                    // Store details in MongoDB
                    const result = await users.insertOne(user);

                    // Retrieve the saved record
                    const data = await users.findOne({
                        _id: result.insertedId
                    });

                    // Make user input safe for HTML display
                    function safe(value) {
                        return String(value).replace(
                            /[&<>"']/g,
                            function (char) {
                                return {
                                    "&": "&amp;",
                                    "<": "&lt;",
                                    ">": "&gt;",
                                    '"': "&quot;",
                                    "'": "&#39;"
                                }[char];
                            }
                        );
                    }

                    const fields = [
                        ["Name", data.name],
                        ["Password", data.password],
                        ["Age", data.age],
                        ["Mobile Number", data.mobile],
                        ["Email", data.email],
                        ["Gender", data.gender],
                        ["State", data.state],
                        ["Skills", data.skills]
                    ];

                    let rows = "";

                    fields.forEach(function (field) {
                        rows += "<tr><td>" +
                            safe(field[0]) +
                            "</td><td>" +
                            safe(field[1]) +
                            "</td></tr>";
                    });

                    // Display the saved details
                    res.writeHead(200, {
                        "Content-Type": "text/html; charset=utf-8"
                    });

                    res.end(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Submitted Details</title>
                            <style>
                                body {
                                    font-family: Arial;
                                    margin: 40px;
                                }

                                h2 {
                                    text-align: center;
                                    color: blue;
                                    text-decoration: underline;
                                }

                                table {
                                    border-collapse: collapse;
                                    width: 60%;
                                    margin: auto;
                                }

                                td {
                                    border: 1px solid #aaa;
                                    padding: 12px;
                                    color: blue;
                                }

                                a {
                                    display: block;
                                    text-align: center;
                                    margin-top: 20px;
                                }
                            </style>
                        </head>
                        <body>
                            <h2>User Submitted Details</h2>

                            <table>
                                ${rows}
                            </table>

                            <a href="/">Back to Home</a>
                        </body>
                        </html>
                    `);

                } catch (error) {
                    console.log(error);

                    res.writeHead(500, {
                        "Content-Type": "text/plain"
                    });
                    res.end("Error saving or retrieving data.");
                }
            });
        }

        // Handle unknown URLs
        else {
            res.writeHead(404, {
                "Content-Type": "text/plain"
            });
            res.end("Page not found");
        }
    });

    server.listen(6001, function () {
        console.log("Server running at http://localhost:6001");
    });
}

startServer().catch(function (error) {
    console.log("Could not start server:", error.message);
});