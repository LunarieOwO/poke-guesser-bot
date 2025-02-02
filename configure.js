const Discord = require("discord.js");
const Database = require("@replit/database");
const util = require("./util");

const db = new Database();

/*
CONFIGURATION UTILITIES
This section includes utilities related to the configuration, but not specific to roles or channels
*/

// Sends a message to the channel with the server configuration.
function showConfig(msg) {
  
  db.get("configuration")
  .then(configuration => {

    // Console Logging
    console.log("Showing configuration.")
    console.log(configuration);

    // Parse Json into javascript object
    configJson = JSON.parse(configuration);

    // Extract roles and channels from array
    const roles = configJson.configuration.roles;
    const channels = configJson.configuration.channels;

    // Format roles names and id for easy viewing
    let roleText = ""
    for (let i = 0; i < roles.length; i++) {
      let currentRole = roles[i];  // Parse string into an object
      roleText += currentRole.name + " (ID: " + currentRole.id + ")\n";  // Create a new role line
    }

    // Format channel names and id for easy viewing
    let channelText = ""
    for (let i = 0; i < channels.length; i++) {
      let currentChannel = channels[i];  // Parse string into an object
      channelText += currentChannel.name + " (ID: " + currentChannel.id + ")\n";  // Create a channel line
    }

    // Creates message template literal
    const message = `ROLES: 
    ${roleText}
    CHANNELS: 
    ${channelText}`;

    // Embeds message
    util.embedReply("Configuration Settings:", message, msg);
  });
}

// Resets the bot configuration
function resetConfig(msg) {

  console.log("Resetting bot configuration.");

  const configuration = {
    "configuration": {
      "channels": [],
      "roles": []
    }
  };

  db.set("configuration", JSON.stringify(configuration));

  // Send message that reset is successful
  const title = "Reset Successful"
  const message = `The configuration has been reset. The bot will listen on all channels and accept commands from all roles. It is recommended to configure moderator roles before using this bot.
  
  Type \`!help\` to see how to configure the bot.`
  util.embedReply(title, message, msg)
}

/*
ROLES
This section includes any role specific functions
*/

// Outputs server roles (name & id)
function roles(msg) {

  let availableRoles = "";
  msg.guild.roles.cache.each(role => availableRoles += role.name + " - " + role.id + "\n");
  util.embedReply("Available Roles", availableRoles, msg);

}

// Checks if role exists, returns true or false
function roleExists(roleName, msg) {

  console.log(`Checking if role exists: >${roleName}<`);  // Logging

  // Returns True if role exists
  return msg.guild.roles.cache.some(role => role.name === roleName);

}

// Gets role from discord server role cache by name
function getRole(roleName, msg) {

  // Returns the requested role
  return msg.guild.roles.cache.find(role => role.name === roleName);

}

// Adds role to bot moderator roles
function addRole(role, msg) {

  // If role exists in server
  if (roleExists(role, msg)) { 

    // Logging
    console.log("Role exists. Adding to database.");

    // Get the configuration from the database
    db.get("configuration").then(configuration => {

      const roleObject = getRole(role, msg);  // Get role object

      // Parse Json into javascript object
      configJson = JSON.parse(configuration);

      // If role exists in configuration
      if (configJson.configuration.roles.some(roleItem => roleItem.id === roleObject.id)) {

        // Don't add role

        console.log("Failed to add role: already in configuration");  // Logging

        // Message
        const title = "ERROR: Role already added!";
        const message = `The role >${role}< is already included in the configuration.
        
        Type \`!show config\` to see the current configuration.`;
        util.embedReply(title, message, msg);

      // If role doesn't exist in configuration
      } else {

        // Create new role array
        var newRole = {
        "name": roleObject.name, 
        "id": roleObject.id
        };

        configJson.configuration.roles.push(newRole);  // Adds role to list of roles

        db.set("configuration", JSON.stringify(configJson));  // Sets the updated list into database

        console.log("Role added successfully.");  // Logging

        // Message
        const title = "New Role Added";
        const message = `The role has been added sucessfully: 
        
        ${roleObject.name} (ID: ${roleObject.id})

        Type \`!show config\` to see the current configuration.`;
        util.embedReply(title, message, msg);

      }

    })

  // If role doesn't exist in server
  } else {

    // Don't add role

    console.log("Failed to add role: doesn't exist.");  // Logging

    // Message
    const title = "ERROR: Failed to add role!";
    const message = `The role >${role}< does not exist and could not be added.

    Type \`!roles\` to see the available roles on this server.`;
    util.embedReply(title, message, msg);

  }
}

// Remove role from bot moderator roles
function removeRole(role, msg) {
  
  // Get the configuration from the database
  db.get("configuration").then(configuration => {

    // Parse Json into javascript object
    configJson = JSON.parse(configuration);

    // Check if the role is in the database
    // If role exists in configuration
    if (configJson.configuration.roles.some(roleItem => roleItem.name === role)) {

      console.log("Role exists in configuration and can be removed.")  // Logging

      // Find index of this role
      const index = configJson.configuration.roles.findIndex(item => item.name === role);

      // Remove role from array
      if (index > -1) {
        configJson.configuration.roles.splice(index, 1);
      }

      db.set("configuration", JSON.stringify(configJson));  // Sets the updated list into database

      // Message
      // Show warning if last role
      if (configJson.configuration.roles.length === 0) {
        console.log("Warning: Last role removed.");
        const title = "Warning: Last role removed";
        const message = `The role >${role}< was removed from configuration. 
        
        There are no roles set to moderate the bot. It is recommended to set at least one role.
        
        Type \`!help\` to see how to add roles.`;
        util.embedReply(title, message, msg);
      // Show regular message if not
      } else {
        console.log("Role removed successfully.")
        const title = "Role removed from configuration.";
        const message = `The role >${role}< was removed from configuration successfully!`;
        util.embedReply(title, message, msg);
      }
      
    } else {

      console.log("Failed to remove role: doesn't exist in configuration.")  // Logging

      const title = "ERROR: Failed to remove role!";
      const message = `The role >${role}< is missing from the configuration and could not be removed.
      
      Type \`!show config\` to see the roles currently in the configuration.`;
      util.embedReply(title, message, msg);

    }

  })
}

// Returns true if user role is in config, or if configuration.roles is empty
function authenticateRole(msg) {

  // Get the configuration from the database
  return db.get("configuration")
    .then(configuration => {

      // Parse Json into javascript object
      configJson = JSON.parse(configuration);

      // Check if the channel is in the database
      if (configJson.configuration.roles.length === 0) {

        console.log("ROLES: Role configuration empty. Authorized."); // Logging
        
        // If there are no channels in config, return true
        return true;

      } else if (configJson.configuration.roles.some(roleItem => msg.member.roles.cache.has(roleItem.id))) {

        console.log(`ROLES: Role found. Authorized.`); // Logging

        // If channel is in configuration, return true, else false
        return true;

      } else {

        console.log(`ROLES: Role NOT found. Forbidden.`); // Logging

        return false;

      }
  })
}

/*
CHANNELS
This section includes any channel specific functions
*/

// Outputs server channels (name & id)
function channels(msg) {

  // String representation of available channels in the server
  let availableChannels = "";

  // For each channel in the channel cache
  msg.guild.channels.cache.each(channel => {
    
    // If the channel is a text channel 
    if (channel.type === "text") {
      // Add it to the available channels
      availableChannels += channel.name + " - " + channel.id + "\n";
    } 

  })

  // Message server
  util.embedReply("Available Channels in this Server", availableChannels, msg);

}

// Check if channel exists, return true or false
function channelExists(channelName, msg) {

  console.log(`Checking if channel exists: >${channelName}<`);  // Logging

  // Returns True if channel exists
  return msg.guild.channels.cache.some(channel => channel.name === channelName);

}

function getChannel(channelName, msg) {

  // Returns the requested role
  return msg.guild.channels.cache.find(channel => channel.name === channelName);

}

// Add channel to bot allowed channels
function addChannel(channel, msg) {

  // If channel exists in server
  if (channelExists(channel, msg)) { 

    // Logging
    console.log("Channel exists. Adding to database.");

    // Get the configuration from the database
    db.get("configuration").then(configuration => {

      const channelObject = getChannel(channel, msg);  // Get channel object

      // Parse Json into javascript object
      configJson = JSON.parse(configuration);

      // If channel exists in configuration
      if (configJson.configuration.channels.some(channelItem => channelItem.id === channelObject.id)) {

        // Don't add channel
        console.log("Failed to add channel: already in configuration.");  // Logging

        // Message
        const title = "ERROR: Channel already added!";
        const message = `The channel >${channel}< is already in the configuration.
        
        Type \`!show config\` to see the current configuration.`;
        util.embedReply(title, message, msg);

      // If channel doesn't exist in configuration
      } else {

        // Create new channel array
        var newChannel = {
        "name": channelObject.name, 
        "id": channelObject.id
        };

        configJson.configuration.channels.push(newChannel);  // Adds channel to list of channels

        db.set("configuration", JSON.stringify(configJson));  // Sets the updated list into database

        console.log("Channel added.");  // Logging

        // Message
        const title = "New Channel Added";
        const message = `The channel has been added sucessfully: 
        
        ${channelObject.name} (ID: ${channelObject.id})

        Type \`!show config\` to see the current configuration.`;
        util.embedReply(title, message, msg);

      }

    })

  // If channel doesn't exist in server
  } else {

    // Don't add channel

    console.log("Failed to add channel: doesn't exist.");  // Logging

    // Message
    const title = "ERROR: Failed to add channel!";
    const message = `The channel >${channel}< does not exist and could not be added.

    Type \`!channels\` to see the available channels on this server.`;
    util.embedReply(title, message, msg);

  }
}

// Remove channel from bot allowed channels
function removeChannel(channel, msg) {

  // Get the configuration from the database
  db.get("configuration").then(configuration => {

    // Parse Json into javascript object
    configJson = JSON.parse(configuration);

    // Check if the channel is in the database
    // If channel exists in configuration
    if (configJson.configuration.channels.some(channelItem => channelItem.name === channel)) {

      console.log("Channel exists in configuration and can be removed.")  // Logging

      // Find index of this channel
      const index = configJson.configuration.channels.findIndex(item => item.name === channel);

      // Remove role from array
      if (index > -1) {
        configJson.configuration.channels.splice(index, 1);
      }

      db.set("configuration", JSON.stringify(configJson));  // Sets the updated list into database

      // Message
      // Show warning if last channel
      if (configJson.configuration.channels.length === 0) {
        console.log("Warning: Last channel removed.");
        const title = "Warning: Last channel removed";
        const message = `The channel >${channel}< was removed from configuration. 
        
        The bot will respond on every channel on this server. If you don't want this, set at least one channel.
        
        Type \`!help\` to see how to add channels.`;
        util.embedReply(title, message, msg);
      // Show regular message if not
      } else {
        console.log("Channel has been removed successfully.")
        const title = "Channel removed from configuration";
        const message = `The channel >${channel}< was removed from configuration successfully!`;
        util.embedReply(title, message, msg);
      }

    } else {

      console.log("Failed to remove channel: doesn't exist in configuration.")  // Logging

      const title = "ERROR: Could not remove channel!";
      const message = `The channel >${channel}< is missing from the configuration and could not be removed.
      
      Type \`!show config\` to see the channels currently in the configuration.`;
      util.embedReply(title, message, msg);

    }

  })
}

// Returns true if channel is in config, or if configuration.channels is empty
function authenticateChannel(msg) {

  // Get the configuration from the database
  return db.get("configuration")
    .then(configuration => {

      // Parse Json into javascript object
      configJson = JSON.parse(configuration);

      // Check if the channel is in the database
      if (configJson.configuration.channels.length === 0) {

        console.log("CHANNELS: Channel configuration empty. Authorized."); // Logging
        
        // If there are no channels in config, return true
        return true;

      } else if (configJson.configuration.channels.some(channelItem => channelItem.name === msg.channel.name)) {

        console.log(`CHANNELS: Channel >${msg.channel.name}< found. Authorized.`); // Logging

        // If channel is in configuration, return true, else false
        return true;

      } else {

        console.log(`CHANNELS: Channel >${msg.channel.name}< NOT found. Forbidden.`); // Logging

        return false;

      }
  })
}

// Function Exports
module.exports.showConfig = showConfig;
module.exports.resetConfig = resetConfig;
module.exports.roles = roles;
module.exports.addRole = addRole;
module.exports.removeRole = removeRole;
module.exports.authenticateRole = authenticateRole;
module.exports.channels = channels;
module.exports.addChannel = addChannel;
module.exports.removeChannel = removeChannel;
module.exports.authenticateChannel = authenticateChannel;
