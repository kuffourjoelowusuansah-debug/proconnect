const express = require('express');
const path = require('path');
const { createStore } = require('../server/store');
const { createApp } = require('../server/app');

let cachedApp = null;

function getApp() {
  if (!cachedApp) {
    const store = createStore();
    cachedApp = createApp({
      store,
      staticDir: path.resolve(__dirname, '..'),
    });
  }
  return cachedApp;
}

module.exports = (req, res) => {
  return getApp()(req, res);
};
