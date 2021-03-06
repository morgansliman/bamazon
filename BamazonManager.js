/**
 * Created by morgansliman on 1/13/17.
 */
const mysql = require('mysql');
const inquirer = require('inquirer');
const pass = require('./pass');
require('console.table');

const conn = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: pass.sql,
    database: 'Bamazon'
});

function main() {
    inquirer.prompt({
        name: 'option',
        type: 'list',
        message: 'Manager Options:',
        choices: [
            'View Products for Sale',
            'View Low Inventory',
            'Add to Inventory',
            'Add New Product'
        ]
    }).then((answer) => {
        switch (answer.option) {
            case 'View Products for Sale':
                viewProducts();
                break;
            case 'View Low Inventory':
                viewLowInventory();
                break;
            case 'Add to Inventory':
                addInventory();
                break;
            case 'Add New Product':
                addNewProduct();
                break;
        }
    });
}

function viewProducts() {
    let query = 'SELECT * FROM `Bamazon`.`Products`;';
    conn.query(query, (err, res) => {
        console.table('Showing Bamazon Inventory:', res);
        exitPrompt();
    });
}

function viewLowInventory() {
    let query = 'SELECT * FROM `Bamazon`.`Products` WHERE `StockQuantity` < 5;';
    conn.query(query, (err, res) => {
        console.table('Showing Low Bamazon Inventory:', res);
        exitPrompt();
    });
}

function addInventory() {
    conn.query('SELECT * FROM `Bamazon`.`Products`;', (err, res) => {
        console.table('Bamazon Inventory', res);
        inquirer.prompt([
            {
            name: 'item',
            type: 'input',
            message: 'Which item would you like to restock?',
            validate: (value) => {
                if (!isNaN(value) && (1 <= value) && (value <= res.length)) {
                    return true;
                }
                return 'Please enter the ItemID of the item you would like to restock';
            }
        }, {
            name: 'quantity',
            type: 'input',
            message: 'How many would you like to add?',
            validate: (value) => {
                if (!isNaN(value) && (0 <= value)) {
                    return true;
                }
                return 'Please enter a positive number, or 0 to exit';
            }
        }, {
            name: 'continue',
            type: 'confirm',
            message: (ans) => {
                let item = res[parseInt(ans.item) - 1];
                let grammar = ans.quantity == 1 ? 'unit' : 'units';
                return `Confirm adding ${ans.quantity} ${grammar} to ${item.ProductName} inventory:`;
            },
            default: true
        }
        ]).then((answers) => {
            if (answers.quantity == 0 || !answers.continue) {
                console.log('Inventory update cancelled.');
                conn.end();
            }
            else {
                let item = res[parseInt(answers.item) - 1];
                item.StockQuantity += parseInt(answers.quantity);
                let query = 'UPDATE `Bamazon`.`Products` SET `StockQuantity` = ? WHERE `ItemID` = ?;';
                conn.query(query, [item.StockQuantity, item.ItemID], (err) => {
                    if (err) throw err;
                    console.log('Inventory updated.');
                    exitPrompt();
                });
            }
        })
    });
}

function addNewProduct() {
    inquirer.prompt([
        {
            name: 'ProductName',
            type: 'input',
            message: 'New product name:'
        },
        {
            name: 'DepartmentName',
            type: 'input',
            message: (ans) => {
                return `Department name for ${ans.ProductName}:`;
            }
        },
        {
            name: 'Price',
            type: 'input',
            message: (ans) => {
                return `Price for ${ans.ProductName}: $`;
            },
            validate: (value) => {
                if (!isNaN(value) && (0 < value)) {
                    return true;
                }
                return 'Price must be a positive number';
            },
            filter: (value) => {
                return parseFloat(value).toFixed(2);
            }
        },
        {
            name: 'StockQuantity',
            type: 'input',
            message: (ans) => {
                return `Number of ${ans.ProductName} units in stock:`;
            },
            validate: (value) => {
                if (!isNaN(value) && (0 <= value) && (value.indexOf('.') == -1)) {
                    return true;
                }
                return 'Quantity must be a positive, whole number or 0';
            }
        }
    ]).then((answers) => {
        console.table([answers]);
        inquirer.prompt([
            {
                name: 'continue',
                type: 'confirm',
                message: 'Is this correct?',
                default: true
            },
            {
                name: 'retry',
                type: 'confirm',
                message: 'Would you like to edit your entry?',
                default: true,
                when: (ans) => {
                    return !ans.continue;
                }
            }
        ]).then((verify) => {
            if (verify.continue) {
                let query = 'INSERT INTO `Bamazon`.`Products` SET ?';
                conn.query(query, answers, (err) => {
                    if (err) throw err;
                    console.log(`New product ~${answers.ProductName}~ added to inventory.`);
                    exitPrompt();
                });
            }
            else if (verify.retry) addNewProduct();
            else exitPrompt();
        });
    });
}

function exitPrompt() {
    inquirer.prompt({
        name:'menu',
        type:'confirm',
        message: 'Return to Manager Options menu?',
        default: true
    }).then((answer) => {
        if (answer.menu) main();
        else {
            console.log('Exiting...');
            conn.end();
        }
    });
}

conn.connect((err) => {
    if (err) throw err;
    main();
});