class Auth {

    token() {
        return "YOUR_DISCORD_TOKEN";
    }

    database() {
        return {
            host: "localhost",
            user: "YOUR_DATABASE_USERNAME",
            password: "YOUR_DATABASE_PASSWORD",
            database: "YOUR_DATABASE_NAME"
        }
    }

}

module.exports = Auth;