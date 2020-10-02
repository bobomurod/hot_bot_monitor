const mysql = require('mysql');
const MySQLEvents = require('@rodrigogs/mysql-events'); // small library for easy watch mysql server events
const ora = require('ora'); // cool spinner for PM2 launcher
require('dotenv').config(); // can read .env file and variables on it
const { Telegraf } = require('telegraf')
const spinner = ora({
    text: '🛸 Waiting for database events... 🛸',
    color: 'blue',
    spinner: 'dots2'
});

/*
creating bot instance
 */
let bot = new Telegraf(process.env.BOT_TOKEN)

const getRow = async () => {
    const connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    })
    try {
        connection.connect(function (err){
            connection.query(sql_last_row, function (err, result){
                if (err) throw err;
                // console.log(result)
                // sendMessage(result[0].id)
                return result[0].id
            })
        })
    } catch (err) {
        console.log('shit happend')
    }

}

let messageSelector = async (row) => {
    const connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    })

    connection.connect(function (err){
        connection.query(sql_last_row, function (err, result){
            if (err) throw err;
            console.log(result)
            sendMessage(result[0].id)
            return result[0].id
        })
    })
}

const productSelector = async (id) => {
    let sql = ` SELECT * FROM product_translations WHERE product_id = (SELECT product_id FROM order_products WHERE id = ${id}) `
    const connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    })

    connection.connect(function (err){
        connection.query(sql, function (err, result){
            if (err) throw err;
            // console.log(result)
            // sendMessage(result[0].id)
            return result[0].id
        })
    })
}

const sendMessage = async (row) => {
    // console.log(row)
    // this.row = row
    // await productSelector(row.id)
    await bot.telegram.sendMessage(process.env.CHANNEL_NAME, row);

}


let sql = 'SELECT * FROM orders'
let sql_last_row = 'SELECT * FROM `orders` WHERE id=(SELECT MAX(id) FROM `orders`)';

const program = async () => {
    const connection = mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: 'root',
        database: 'sphouse'
    });

    const instance = new MySQLEvents(connection, {
        startAtEnd: true // to record only the new binary logs, if set to false or you didn'y provide it all the events will be console.logged after you start the app
    });

    await instance.start();

    instance.addTrigger({
        name: 'monitoring all statments',
        expression: 'sphouse.*', // listen to TEST database !!!
        statement: MySQLEvents.STATEMENTS.INSERT, // you can choose only insert for example MySQLEvents.STATEMENTS.INSERT, but here we are choosing everything
        onEvent: async (e) => {
            console.log(e);
            spinner.succeed('👽 _EVENT_ 👽');
            // console.log('123')
            let row = await getRow();
            await sendMessage(row)
            spinner.start();
        }
    });

    instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error);
    instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error);
    // instance.on(MySQLEvents.STATEMENTS.INSERT, console.log('inserted new row'))
};

program()
    .then(spinner.start.bind(spinner))
    .catch(console.error);


// 1. Наименование товара
// 2. Дата заказа
// 3. Номер телефона заказчика
// 4. Адрес доставки
// 5. Ссылка к товару
