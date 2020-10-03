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

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
})

async function connect() {
    try {
        await new Promise((resolve, reject) => {
            connection.connect((err => {
                return err ? reject(err) : resolve()
            }))
        })
    } catch (e) {
        throw new Error(e)
    }
}

connect().catch(e => console.log(e))

/*
creating bot instance
 */
let bot = new Telegraf(process.env.BOT_TOKEN)


let promiseGetRow = async (sql) => {
    return new Promise((resolve, reject) => {
        connection.query(sql    , function (err, result){
            if (err) throw err;
            // console.log(result[0].id)
            // sendMessage(result[0].id)
            resolve (result[0])
        })
    })
}

let getRow = async (sql) => {
    let result
    try {
        result = promiseGetRow(sql)
    } catch (e) {
        console.log(e)
    }
    return result
}

let dataCollector = async (row) => {
    return {
        productInfo : await productSelector(row.id),
        orderDate: row.created_at,
        customerFirstname: row.customer_first_name,
        customerLastname: row.customer_last_name,
        customerPhone: row.customer_phone,
        shippingAddress_1: row.shipping_address_1,
        shippingAddress_2: row.shipping_address_2,
    }


}

let productSelector = async (id) => {
    let sql = ` SELECT * FROM product_translations WHERE product_id = (SELECT product_id FROM order_products WHERE id = ${id}) `
    return new Promise((resolve, reject) => {
        connection.query(sql, function (err, result) {
            if (err) reject (err);
            resolve({
                productName: result[0].name,
                productDescription: result[0].description,
            })
        })
    })
}

let markdownGenerator = async (data) => {
    return `**Новый заказ!**\n
Товар **${data.productInfo.productName}**\n
Имя **${data.customerFirstname}**\n
Фамилия **${data.customerLastname}**\n
[+${data.customerPhone}](tel:+${data.customerPhone})\n
Адрес 1 **${data.shippingAddress_1}**\n
Адрес 2 **${data.shippingAddress_2}**`
}

const sendMessage = async (message) => {
    // console.log(row)
    // this.row = row
    // await productSelector(row.id)
    console.log(message)
    await bot.telegram.sendMessage(process.env.CHANNEL_NAME, message, {parse_mode: "Markdown"});

}

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
            // let row = await getRow(sql_last_row);
            let row = await getRow(sql_last_row)
            let collectedData = await dataCollector(row)
            // let selectedRow = await productSelector(row)
            let readyMessage = await markdownGenerator(collectedData)
            await sendMessage(readyMessage)
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
// <b>Новый заказ!</b>
// <h2><h2>


/*
**Новый заказ!**
Товар ⋅⋅* **${}**
Имя ⋅⋅* **${}**
Фамилия ⋅⋅* **${}**
Телефон ⋅⋅* **${}**
Дата ⋅⋅* **${}**
Адрес 1 ⋅⋅* **${}**
Адрес 2 ⋅⋅* **${}**

 */