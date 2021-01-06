package me.nullcat.test;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import org.bukkit.BanList;
import org.bukkit.Bukkit;
import org.bukkit.ChunkSnapshot;
import org.bukkit.block.Block;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockDamageEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.world.ChunkLoadEvent;
import org.bukkit.plugin.java.JavaPlugin;

public class requestHandler {
    public requestHandler() throws IOException {
        System.out.print("Starting http server...");
        HttpServer server = HttpServer.create(new InetSocketAddress(2649), 0);
        server.createContext("/", new MyHandler());
        server.setExecutor(null); // creates a default executor
        server.start();
        System.out.print("Server http started");
    }

    static class MyHandler implements HttpHandler {
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
                Bukkit.getServer().getBanList(BanList.Type.NAME).addBan(command[1],"Banned on WEAMC",null,null);
                Bukkit.getServer().getPlayer(command[1]).kickPlayer("Kicked");
            }   else if (command[0].equals("kick")){
                Bukkit.getServer().getPlayer(command[1]).kickPlayer("Kicked");
                Bukkit.getServer().dispatchCommand(Bukkit.getServer().getConsoleSender(), "kick "+command[1]);
            }

            t.sendResponseHeaders(200, response.length());
            OutputStream os = t.getResponseBody();
            os.write(response.getBytes());
            os.close();
        }
    }
}
