package me.nullcat.test;

import java.sql.*;

public class conSql {

    private Connection connection;
    private String host, database, username, password;
    private int port;

    public conSql() {
        host = "localhost";
        port = 3306;
        database = "weamc";
        username = "root";
        password = "root";
        try {
            openConnection();
            Statement statement = connection.createStatement();
        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public void openConnection() throws SQLException, ClassNotFoundException {
        if (connection != null && !connection.isClosed()) {
            return;
        }

        synchronized (this) {
            if (connection != null && !connection.isClosed()) {
                return;
            }
            Class.forName("com.mysql.jdbc.Driver");
            connection = DriverManager.getConnection("jdbc:mysql://" + this.host + ":" + this.port + "/" + this.database + "?useSSL=false", this.username, this.password);
        }
    }

    public void execute(String query) throws SQLException, ClassNotFoundException {
        openConnection();
        Statement statement = connection.createStatement();
        statement.execute(query);
    }

    public ResultSet select(String query) throws SQLException, ClassNotFoundException {
        openConnection();
        Statement statement = connection.createStatement();
        ResultSet results = statement.executeQuery(query); //SQL execute
        return results;
    }

    public Boolean exists(String query) throws SQLException, ClassNotFoundException {
        openConnection();
        Statement statement = connection.createStatement();
        ResultSet results = statement.executeQuery(query); //SQL execute
        results.last();
        Integer fetchSize = results.getRow();
        if (fetchSize.equals(0)) {
            return false;
        } else {
            return true;
        }
    }
}