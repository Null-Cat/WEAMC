package me.nullcat.test;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import org.bukkit.BanList;
import org.bukkit.Bukkit;
import org.bukkit.Server;
import org.bukkit.plugin.Plugin;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;

public class requestHandler<minecraftServer> {
    public requestHandler(Server minecraftServer, Plugin plugin) throws IOException {
        System.out.print("Starting http server...");
        HttpServer server = HttpServer.create(new InetSocketAddress(2649), 0);
        server.createContext("/", new MyHandler(minecraftServer, plugin));
        server.setExecutor(null); // creates a default executor
        server.start();
        System.out.print("Server http started");
    }

    static class MyHandler implements HttpHandler {
        private Server minecraftServer;
        private Plugin mainPlugin;
        public MyHandler(Server minecraftServer, Plugin plugin){
            this.minecraftServer = minecraftServer;
            mainPlugin = plugin;
        }

        @Override
        public void handle(HttpExchange t) throws IOException {

            String response = t.getRequestURI().getQuery() + " ";
            if (t.getRequestURI().getQuery() != null) {
                System.out.print(response);
            }
            String query = t.getRequestURI().getQuery();
            query = query.replace("command=", "");
            String[] command = query.split(":");
            if (command[0].equals("ban")){
                minecraftServer.getBanList(BanList.Type.NAME).addBan(command[1],"Banned on WEAMC",null,null);
                Bukkit.getScheduler().runTask(mainPlugin, () -> {
                    minecraftServer.getPlayer(command[1]).kickPlayer("Banned by WEAMC");
                });
            }   else if (command[0].equals("kick")){
                Bukkit.getScheduler().runTask(mainPlugin, () -> {
                    minecraftServer.getPlayer(command[1]).kickPlayer("Kicked by WEAMC");
                });
            }

            t.sendResponseHeaders(200, response.length());
            OutputStream os = t.getResponseBody();
            os.write(response.getBytes());
            os.close();
        }
    }
}
