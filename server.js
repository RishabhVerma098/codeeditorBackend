const express = require("express");
const colors = require("colors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const socket = require("socket.io");
const { userJoin, userLeave, getCurrentUser } = require("./dummyuser");
const { python } = require("compile-run");
const app = express();

dotenv.config({ path: "./config/config.env" });

const port = process.env.PORT || 5000;

var server = app.listen(
  port,
  console.log(
    `Server is running in ${process.env.NODE_ENV} on port ${process.env.PORT}`
      .yellow.bold
  )
);

// initialized
const io = socket(server);

//everything related to io will go here
io.on("connection", (socket) => {
  //when new user join room
  socket.on("joinRoom", ({ username, roomname }) => {
    //* create user
    const user = userJoin(socket.id, username, roomname);
    console.log(socket.id, "=id");
    socket.join(user.room);

    //! TODO:
    //* Broadcast message to everyone except user that he has joined
    socket.broadcast.to(user.room).emit("message", {
      userId: user.id,
      username: user.username,
      text: `${user.username} has joined`,
    });
  });

  socket.on("program", (text) => {
    //* get user room and emit message
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit("code", {
      text: text,
    });
  });

  socket.on("compile", (code) => {
    const user = getCurrentUser(socket.id);
    let resultPromise = python.runSource(code);
    resultPromise
      .then((result) => {
        io.to(user.room).emit("complied-code", {
          result: result,
        });
      })
      .catch((err) => {
        io.to(user.room).emit("complied-code", {
          result: err,
        });
      });
  });

  // Disconnect , when user leave room
  socket.on("disconnect", () => {
    // * delete user from users & emit that user has left the chat
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit("message", {
        userId: user.id,
        username: user.username,
        text: `${user.username} has left`,
      });
    }
  });
});
