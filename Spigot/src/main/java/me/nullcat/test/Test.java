package me.nullcat.test;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public final class Test extends JavaPlugin implements Listener {
    conSql sqlca = new conSql(); //Creates new Connection SQL instance
    @Override
    public void onEnable() {
        // Plugin startup logic
        System.out.println("Running Test Plugin");
        System.out.println("Memory Usage is: " + (Runtime.getRuntime().maxMemory() - Runtime.getRuntime().freeMemory()) / 1048576 + "MB/" + Runtime.getRuntime().maxMemory() / 1048576 + "MB");

        try {
            sqlca.testt();
        } catch (SQLException | ClassNotFoundException throwables) {
            throwables.printStackTrace();
        }
        Bukkit.getScheduler().runTaskAsynchronously(this, () -> {
            final ScheduledExecutorService executorService = Executors.newSingleThreadScheduledExecutor();
            executorService.scheduleAtFixedRate(() -> {
                HashMap values = new HashMap<String, String>() {{
                    put("memoryused", String.valueOf((Runtime.getRuntime().maxMemory() - Runtime.getRuntime().freeMemory()) / 1048576) + "MB");
                    put("memorymax", String.valueOf(Runtime.getRuntime().maxMemory() / 1048576) + "MB");
                    put("playercount", String.valueOf(Bukkit.getOnlinePlayers().size()));
                }};

                ObjectMapper objectMapper = new ObjectMapper();
                String requestBody = null;
                try {
                    requestBody = objectMapper.writeValueAsString(values);
                } catch (JsonProcessingException e) {
                    e.printStackTrace();
                }

                HttpClient client = HttpClient.newHttpClient();
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create("http://127.0.0.1/pluginrequest"))
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .setHeader("Content-type", "application/json")
                        .build();

                try {
                    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                    System.out.println(response.headers());
                } catch (IOException e) {
                    e.printStackTrace();
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }, 0, 60, TimeUnit.SECONDS);
        });
        Bukkit.getScheduler().runTaskAsynchronously(this, () -> {
            try {
                requestHandler httpserver = new requestHandler();
            } catch (IOException e) {
                e.printStackTrace();
            }
        });

        getServer().getPluginManager().registerEvents(this, this);

    }

    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) throws SQLException, ClassNotFoundException {
        //conSql sqlca = new conSql(); //Creates new Connection SQL instance
        if (!event.getPlayer().hasPlayedBefore()) {
            sqlca.execute("INSERT INTO players(UUID, username, isOperator, isOnline) VALUES ('" + event.getPlayer().getUniqueId() + "', '" + event.getPlayer().getName() + "', " + "0, 1)");
        } else {
            sqlca.execute("UPDATE players SET isOnline = 1 WHERE UUID = '" + event.getPlayer().getUniqueId() + "'");
        }
        if (event.getPlayer().isOp()) {
            sqlca.execute("UPDATE players SET isOperator = 1 WHERE UUID = '" + event.getPlayer().getUniqueId() + "'");
        }
    }

    @EventHandler
    public void onPlayerLeave(PlayerQuitEvent event) throws SQLException, ClassNotFoundException {
        //conSql sqlca = new conSql(); //Creates new Connection SQL instance
        sqlca.execute("UPDATE players SET isOnline = 0 WHERE UUID = '" + event.getPlayer().getUniqueId() + "'");
    }

    @EventHandler
    public void onChunkLoad(ChunkLoadEvent event) throws SQLException, ClassNotFoundException {
        ChunkSnapshot chunk = event.getChunk().getChunkSnapshot();
        getLogger().info(event.getChunk().getX() + " " + event.getChunk().getZ());
        //conSql sqlca = new conSql(); //Creates new Connection SQL instance
        for (int i = 0; i < 16; i++) {
            for (int ii = 0; ii < 16; ii++) {
                //getLogger().info("x: " + i + " z: " + ii + " Block: " + chunk.getBlockType(i, chunk.getHighestBlockYAt(i, ii) - 1, ii));
                if (sqlca.exists("SELECT wcoords, intercoords FROM chunks WHERE wcoords = '" + event.getChunk().getX() + "," + event.getChunk().getZ() + "'" +
                        "AND intercoords = '" + String.valueOf(i) + "," + String.valueOf(ii) + "'")) {
                    sqlca.execute("UPDATE chunks SET blockid = '" + chunk.getBlockType(i, chunk.getHighestBlockYAt(i, ii) - 1, ii) + "' WHERE wcoords = '" + event.getChunk().getX() + "," + event.getChunk().getZ() + "'" +
                            "AND intercoords = '" + String.valueOf(i) + "," + String.valueOf(ii) + "'");
                } else {
                    sqlca.execute("INSERT INTO chunks(wcoords, intercoords, blockid) " +
                            "VALUES ('" + event.getChunk().getX() + "," + event.getChunk().getZ() + "', '" +
                            String.valueOf(i) + "," + String.valueOf(ii) + "', '" + chunk.getBlockType(i, chunk.getHighestBlockYAt(i, ii) - 1, ii) + "')");
                }
            }
        }
        HashMap values = new HashMap<String, String>() {{
            put("x", String.valueOf(event.getChunk().getX()));
            put("y", String.valueOf(event.getChunk().getZ()));
        }};

        ObjectMapper objectMapper = new ObjectMapper();
        String requestBody = null;
        try {
            requestBody = objectMapper.writeValueAsString(values);
        } catch (JsonProcessingException e) {
            e.printStackTrace();
        }

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://127.0.0.1/processchunk"))
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .setHeader("Content-type", "application/json")
                .build();

        try {
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            System.out.println(response.headers());
        } catch (IOException e) {
            e.printStackTrace();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

    }

    @EventHandler
    public void onPlayerHit(BlockDamageEvent event) {
        Player plr = event.getPlayer();
        Block blk = event.getBlock();
        plr.sendMessage(blk.getChunk().getX() + " " + blk.getChunk().getZ());
        ChunkSnapshot snap = blk.getLocation().getChunk().getChunkSnapshot();
        plr.sendMessage(String.valueOf(snap.getBlockType(0, snap.getHighestBlockYAt(0, 0) - 1, 0)) + snap.getHighestBlockYAt(0, 0));
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (command.getName().equals("mapChunk")) {
            if (sender instanceof Player) {
                Player plr = ((Player) sender).getPlayer();
                ChunkSnapshot snap = plr.getLocation().getChunk().getChunkSnapshot();
                plr.sendMessage("You are in grid num: " + (plr.getLocation().getChunk().getX()) + ", " + (plr.getLocation().getChunk().getZ()));
                for (int i = 0; i < 16; i++) {
                    for (int ii = 0; ii < 16; ii++) {
                        plr.sendMessage("x: " + i + " z: " + ii + " Block: " + snap.getBlockType(i, snap.getHighestBlockYAt(i, ii) - 1, ii));
                    }
                }
            } else {
                getLogger().info("Not a Console Command");
            }
        }

        return super.onCommand(sender, command, label, args);
    }
}

