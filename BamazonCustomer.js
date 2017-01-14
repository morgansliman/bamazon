/**
 * Created by morgansliman on 1/11/17.
 */
const mysql = require('mysql');
const pass = require('./pass');
const inquirer = require('inquirer');
require('console.table');

const conn = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: pass.sql,
    database: 'Bamazon'
});

function formatMoney(price) {
    var dollars;
    var cents = price.indexOf('.') == -1 ? (
        dollars = price,
        '00'
        ) : price.split('.')[1].length == 1 ? (
            dollars = price.split('.')[0],
            price.split('.')[1] + '0'
            ) : (
                dollars = price.split('.')[0],
                price.split('.')[1]
            );

    return `$${dollars}.${cents}`;
}
function updateDatabase(item, quantity) {
    var total = item.Price * quantity;
    var query = "UPDATE `Bamazon`.`Products` SET `StockQuantity`= ? WHERE `ItemID`= ?;";
    item.StockQuantity -= quantity;
    conn.query(query, [item.StockQuantity, item.ItemID], function(err) {
        if (err) throw err;
    });
    total = formatMoney(total.toString());
    console.log('Total cost:', total);
    inquirer.prompt({
        type: 'confirm',
        name: 'continue',
        message: 'Would you like to continue shopping?',
        default: true
    }).then(function(answer) {
        if (answer.continue) bamazonCustomer();
        else {
            console.log('Thanks for shopping with us!');
            conn.end();
        }
    });
}

function bamazonCustomer() {
    conn.query('SELECT * FROM Bamazon.Products;', function(err, res) {
        if (err) throw err;
        console.table('Bamazon Inventory', res);
        inquirer.prompt({
            name: 'item',
            type: 'input',
            message: 'Which item would you like to buy:',
            validate: function(value) {
                if (!isNaN(value) && (1 <= value) && (value <= res.length)) {
                    return true;
                }
                return 'Please enter the ItemID of the item you would like to buy';
            }
        }).then(function(answer) {

            var item = res[parseInt(answer.item) - 1];

            inquirer.prompt({
                name: 'quantity',
                type: 'input',
                message: 'How many would you like to buy:',
                validate: function(value) {
                    if (!isNaN(value) && (0 <= value)) {
                        if (value > item.StockQuantity) {
                            return 'Insufficient Quantity! Please enter a lower number, or 0 to cancel purchase';
                        }
                        return true;
                    }
                    else {
                        return 'Please enter a positive number, or 0 to cancel purchase';
                    }
                }
            }).then(function(answer) {
                if (answer.quantity == 0) {
                    console.log('Purchase cancelled');
                    conn.end();
                }
                else {
                    updateDatabase(item, answer.quantity);
                }
            });
        })
    });
}

conn.connect(function(err) {
    if (err) throw err;
    bamazonCustomer();
});