'use strict';

const libQ = require('kew');
const Conf = require('v-conf');
const TidalAPI = require('tidalapi');

module.exports = class ControllerTidalPlugin {

  constructor(context) {
    this.context = context;
    this.commandRouter = this.context.coreCommand;
    this.logger = this.context.logger;
    this.configManager = this.context.configManager;
    this.uris = {
      tidal: 'tidal',
      myPlaylists: 'tidal/my_playlists',
      myAlbums: 'tidal/my_albums',
      myTracks: 'tidal/my_tracks'
    }
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::constructor`);
  }

  /**
   * onVolumioStart
   * @return
   */
  onVolumioStart() {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::onVolumioStart`);

    const configFile = this.commandRouter
      .pluginManager
      .getConfigurationFile(this.context, 'config.json');
    
    this.config = new Conf();
    this.config.loadFile(configFile);

    return libQ.resolve();
  }

  login() {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::login`);

    var username = this.config.get('username');
    var password = this.config.get('password');
    var token = this.config.get('token');
    var quality = this.config.get('quality');
  
    if (this.isSet(username) && 
        this.isSet(password) && 
        this.isSet(token) && 
        this.isSet(quality)) {

          this.api = new TidalAPI({
            username: username,
            password: password,
            token: token,
            // clientVersion: '2.2.1--7',
            quality: quality
          });

          this.addToBrowseSources();
    }
  }

  /**
   * onStart
   * @return
   */
  onStart() {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::onStart`);
    this.mpdPlugin = this.commandRouter.pluginManager.getPlugin('music_service', 'mpd');
    
    const defer = libQ.defer();
    // this.login(); // TODO: Doesn't work, need to hardcode credentials
    api = new TidalAPI({
      username: '',
      password: '',
      token: '',
      // clientVersion: '2.2.1--7',
      quality: 'LOSSLESS'
    });
    // this.api.tryLogin(this.api.authData, () => {
    //   this.userId = this.api.getMyID();
    //   this.addToBrowseSources();
    //   defer.resolve();
    // });
    this.addToBrowseSources();
    defer.resolve();
    return defer.promise;
  }

  /**
   * onStop
   * @return
   */
  onStop() {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::onStop`);

    const defer = libQ.defer();
    // Once the Plugin has successfull stopped resolve the promise
    defer.resolve();
    return libQ.resolve();
  }

  /**
   * onRestart
   * @return void
   */
  onRestart() {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::onRestart`);
    // Optional, use if you need it
  }

  /*
  |--------------------------------------------------------------------------
  | Configuration Methods
  |--------------------------------------------------------------------------
  */

  /**
   * getUIConfig
   * @return promise
   */
  getUIConfig() {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::getUIConfig`);

    const defer = libQ.defer();
    const self = this;
    const langCode = this.commandRouter.sharedVars.get('language_code');

    self.commandRouter
      .i18nJson(`${__dirname}/i18n/strings_${langCode}.json`,
        `${__dirname}/i18n/strings_en.json`,
        `${__dirname}/UIConfig.json`)
      .then((uiconf) => {
        defer.resolve(uiconf);
      })
      .fail(() => {
        defer.reject(new Error());
      });

    return defer.promise;
  }

  /**
   * setUIConfig
   * @return void
   */
  setUIConfig() {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::setUIConfig`);
    // Perform your installation tasks here
  }

  /**
   * getConf
   * @return void
   */
  getConf() {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::getConf`);
    // Perform your installation tasks here
  }

  /*
  |--------------------------------------------------------------------------
  | Playback controls
  |--------------------------------------------------------------------------
  */

  /**
   * addToBrowseSources
   * @return void
   */
  addToBrowseSources() {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::addToBrowseSources`);

    this.commandRouter.volumioAddToBrowseSources({
      name: 'Tidal',
      uri: this.uris.tidal,
      plugin_type: 'music_service',
      plugin_name: 'tidal',
      albumart: '/albumart?sourceicon=music_service/tidal/tidal.svg',
    });
  }

  /**
   * handleBrowseUri
   * @return void
   */
  handleBrowseUri(uri) {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::handleBrowseUri(${uri})`);
    var response;

    if (uri.startsWith(this.uris.tidal)) {
      if (uri == this.uris.tidal) {
        response = libQ.resolve({
          navigation: {
            lists: [{
              availableListViews: [
                'list'
              ],
              items: [
                {
                  service: 'tidal',
                  type: 'tidal-category',
                  title: 'My Playlists',
                  artist: '',
                  album: '',
                  icon: 'fa fa-folder-open-o',
                  uri: this.uris.myPlaylists
                },{
                  service: 'tidal',
                  type: 'tidal-category',
                  title: 'My Albums',
                  artist: '',
                  album: '',
                  icon: 'fa fa-folder-open-o',
                  uri: this.uris.myAlbums
                },
                {
                  service: 'tidal',
                  type: 'tidal-category',
                  title: 'My Tracks',
                  artist: '',
                  album: '',
                  icon: 'fa fa-folder-open-o',
                  uri: this.uris.myTracks
                }
              ]
            }],
            prev: {
              uri: this.uris.tidal
            },
          },
        });
      } else if (uri == this.uris.myPlaylists) {
        response = this.listMyPlaylists();
      } else if (uri == this.uris.myAlbums) {
        response = this.listMyAlbums();
      } else if (uri == this.uris.myTracks) {
        response = this.listMyTracks();
      } else if (uri.startsWith('tidal:playlist:')) {
        var playlistId = uri.split(':')[2]
        response = this.listPlaylistTracks(playlistId);
      } else if (uri.startsWith('tidal:album:')) {
        var albumId = uri.split(':')[2]
        response = this.listAlbumTracks(albumId);
      }
    }
    return response;
  }

  listMyPlaylists() {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::listMyPlaylists`);
    const defer = libQ.defer();
    const default_icon = '/albumart?sourceicon=music_service/tidal/default_icon.svg'

    var response = {
      navigation: {
        lists: [{
          availableListViews: ['list', 'grid'],
          items: [],
        }],
        prev: {
          uri: 'tidal'
        }
      }
    };

    this.api.getMyPlaylists({}, (data) => {
      data.items.map(playlist => {
        response.navigation.lists[0].items.push({
          service: 'tidal',
          type: 'folder',
          title: playlist.title,
          artist: '',
          album: '',
          albumart: playlist.image ? this.api.getArtURL(playlist.image, 320, 214) : default_icon,
          uri: `tidal:playlist:${playlist.uuid}`
        });
      });
      defer.resolve(response);
    });

    return defer.promise;
  }

  listPlaylistTracks(playlistId) {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::listPlaylistTracks ${playlistId}`);
    const defer = libQ.defer();
    const default_icon = '/albumart?sourceicon=music_service/tidal/default_icon.svg'

    var response = {
      navigation: {
        lists: [{
          availableListViews: [
            'list',
          ],
          items: [],
        }],
        prev: {
          uri: this.uris.myPlaylists
        }
      }
    };

    this.api.getPlaylistTracks({id: playlistId}, (data) => {
      data.items.map(track => {
        response.navigation.lists[0].items.push({
          service: 'tidal',
          type: 'song',
          title: track.title,
          artist: track.artists[0].name, // this.getTrackArtists(track.artists),
          album: track.album.title,
          albumart: track.album.cover ? this.api.getArtURL(track.album.cover, 80, 80) : default_icon,
          uri: `tidal:track:${track.id}`
        });
      });
      defer.resolve(response);
    });

    return defer.promise;
  }

  listMyTracks() {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::listMyTracks`);
    const defer = libQ.defer();
    const default_icon = '/albumart?sourceicon=music_service/tidal/default_icon.svg'

    var response = {
      navigation: {
        lists: [{
          availableListViews: ['list'],
          items: [],
        }],
        prev: {
          uri: 'tidal'
        }
      }
    };

    this.api.getMyTracks({}, (data) => {
      data.items.map(track => {
        response.navigation.lists[0].items.push({
          service: 'tidal',
          type: 'song',
          title: track.item.title,
          artist: track.item.artists[0].name, // this.getTrackArtists(track.artists),
          album: track.item.album.title,
          albumart: track.item.album.cover ? this.api.getArtURL(track.item.album.cover, 80, 80) : default_icon,
          uri: `tidal:track:${track.item.id}`
        });
      });
      defer.resolve(response);
    });

    return defer.promise;
  }

  listMyAlbums() {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::listMyAlbums`);
    const defer = libQ.defer();
    const default_icon = '/albumart?sourceicon=music_service/tidal/default_icon.svg'

    var response = {
      navigation: {
        lists: [{
          availableListViews: ['list', 'grid'],
          items: [],
        }],
        prev: {
          uri: this.uris.tidal
        }
      }
    };

    this.api.getMyAlbums({}, (data) => {
      data.items.map(album => {
        response.navigation.lists[0].items.push({
          service: 'tidal',
          type: 'folder',
          title: album.item.title,
          artist: album.item.artists[0].name, // this.getTrackArtists(track.artists),
          album: album.item.title,
          albumart: album.item.cover ? this.api.getArtURL(album.item.cover, 320, 320) : default_icon,
          uri: `tidal:album:${album.item.id}`
        });
      });
      defer.resolve(response);
    });

    return defer.promise;
  }

  listAlbumTracks(albumId) {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::listAlbumTracks ${albumId}`);
    const defer = libQ.defer();
    const default_icon = '/albumart?sourceicon=music_service/tidal/default_icon.svg'

    var response = {
      navigation: {
        lists: [{
          availableListViews: [
            'list',
          ],
          items: [],
        }],
        prev: {
          uri: this.uris.myAlbums
        }
      }
    };

    this.api.getAlbumTracks({id: albumId}, (data) => {
      data.items.map(track => {
        response.navigation.lists[0].items.push({
          service: 'tidal',
          type: 'song',
          title: track.title,
          artist: track.artists[0].name, // this.getTrackArtists(track.artists),
          album: track.album.title,
          albumart: track.album.cover ? this.api.getArtURL(track.album.cover, 80, 80) : default_icon,
          uri: `tidal:track:${track.id}`
        });
      });
      defer.resolve(response);
    });

    return defer.promise;
  }


  /**
   * Define a method to clear, add, and play an array of tracks
   * @return
   */
  clearAddPlayTrack(track) {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::clearAddPlayTrack`);
    this.commandRouter.logger.info(JSON.stringify(track));

    return this.mpdPlugin.sendMpdCommand('stop', [])
      .then(() => this.mpdPlugin.sendMpdCommand('clear', []))
      .then(() => this.mpdPlugin.sendMpdCommand(`load "${track.uri}"`, []))
      .fail(() => this.mpdPlugin.sendMpdCommand(`add "${track.uri}"`, []))
      .then(() => {
        return this.mpdPlugin.sendMpdCommand('play', []).then(() => {
          return this.mpdPlugin.getState().then((state) => {
            const parsedState = this.mpdPlugin.parseState(state);
            this.commandRouter.logger.info(`State ${JSON.stringify(state)}`);
            this.commandRouter.logger.info(`parsedState ${JSON.stringify(parsedState)}`);
            return this.commandRouter.stateMachine.syncState(state, 'tidal');
          });
        });
      });
  }

  /**
   * seek
   * @return
   */
  seek(timepos) {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::seek to ${timepos}`);

    return this.mpdPlugin.seek(position);
  }

  /**
   * stop
   * @return void
   */
  stop() {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::stop`);

    return this.mpdPlugin.sendMpdCommand('stop', []);
  }

  /**
   * pause
   * @return void
   */
  pause() {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::pause`);
    this.commandRouter.stateMachine.setConsumeUpdateService('mpd');

    return this.mpdPlugin.sendMpdCommand('pause', []);
  }

  /**
   * resume
   * @return void
   */
  resume() {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::resume`);
    this.commandRouter.stateMachine.setConsumeUpdateService('mpd');

    return this.mpdPlugin.sendMpdCommand('play', []);
  }

  /**
   * getState
   * @return void
   */
  getState() {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::getState`);

    return this.mpdPlugin.getState();
  }

  /**
   * parseState
   * @return void
   */
  parseState() {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::parseState}`);
    return this.mpdPlugin.parseState();
    // Use this method to parse the state and eventually send it with the following function
  }

  /**
   * pushState
   * @return
   */
  pushState(state) {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::pushState`);
    return this.commandRouter.servicePushState(this.getState(), this.servicename);
  }

  /**
   * explodeUri
   * @return
   */
  explodeUri(uri) {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::explodeUri`);

    const defer = libQ.defer();

    // Play
    if (uri.startsWith('tidal:track:')) {
      const uriSplitted = uri.split(':');
      this.api.getStreamURL({ id: uriSplitted[2] }, (streamData) => {
        this.api.getTrackInfo({ id: uriSplitted[2] }, (trackInfo) => {
          this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::explodeUri ${JSON.stringify(streamData)}`);
          this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::explodeUri ${JSON.stringify(trackInfo)}`);
          defer.resolve({
            uri: streamData.url,
            service: 'tidal',
            name: trackInfo.title,
            artist: trackInfo.artist.name,
            album: trackInfo.album.name,
            type: 'song',
            duration: trackInfo.duration,
            tracknumber: trackInfo.trackNumber,
            albumart: trackInfo.album.cover ? this.api.getArtURL(trackInfo.album.cover, 1280) : '',
            samplerate: streamData.soundQuality === 'HI_RES' ? '96 kHz' : '44.1 kHz',
            bitdepth: streamData.soundQuality === 'HI_RES' ? '24 bit' : '16 bit',
            trackType: streamData.codec,
          });
        });
      });
    }

    return defer.promise;
  }

  /**
   * getAlbumArt
   * @return string
   */
  getAlbumArt(data, path) {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::getAlbumArt`);

    return `${data}${path}`;
  }

  /**
   * search
   * @param string
   * @return string
   */
  search(q) {
    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::search ${JSON.stringify(q)}`);
    const defer = libQ.defer();
    const list = [];
    const default_icon = '/albumart?sourceicon=music_service/tidal/default_icon.svg'

    this.api.search({
      type: 'tracks,albums,artists',
      query: q.value,
      limit: 10,
    }, (data) => {
      list.push({
        type: 'title',
        title: 'Tidal Artists',
        availableListViews: ['list', 'grid'],
        items: data.artists.items.map(artist => ({
          service: 'tidal',
          type: 'folder',
          title: artist.name,
          albumart: artist.picture ? this.api.getArtURL(artist.picture, 160, 160) : default_icon, // TODO: default pic if one can't be found
          uri: `tidal:artist:${artist.id}`,
        })),
      });
      list.push({
        type: 'title',
        title: 'Tidal Tracks',
        availableListViews: ['list'],
        items: data.tracks.items.map(track => ({
          service: 'tidal',
          type: 'song',
          title: track.title,
          artist: track.artists[0].name, // this.getTrackArtists(track.artists),
          album: track.album.title,
          albumart: track.album.cover ? this.api.getArtURL(track.album.cover, 80, 80) : default_icon,
          uri: `tidal:track:${track.id}`,
        })),
      });
      list.push({
        type: 'title',
        title: 'Tidal Albums',
        availableListViews: ['list', 'grid'],
        items: data.albums.items.map(album => ({
          service: 'tidal',
          type: 'folder',
          title: album.title,
          albumart: album.cover ? this.api.getArtURL(album.cover, 320, 320) : default_icon,
          uri: `tidal:album:${album.id}`,
        })),
      });

      defer.resolve(list);
    });

    return defer.promise;
  }

  getArtistsString(artistsInfo) {
    function artistString(artistsList) {
      var artistsString;
      if (artistsList.length > 1) {
        var lastArtist = artistsList.pop();
        artistsString = artistsList.map(artist => artist.name).join(', ') + ', and ' + lastArtist.name;
      } else {
        artistsString = artistsList[0].name;
      }
      return artistsString;
    }
    var artistsString = artistString(artistsInfo.filter(artist => artist.type == 'MAIN'));
    var featuredArtists = artistString(artistsInfo.filter(artist => artist.type == 'FEATURED'));
    if(featuredArtists !== '') {
      artistsString += (' ft. ' + featuredArtists);
    }
    return artistsString;
  }

  /**
   * saveTidalAccount
   * @return void
   */
  saveAccount(data) {
    const defer = libQ.defer();

    this.config.set('username', data.username);
    this.config.set('password', data.password);
    this.config.set('token', data.token);
    this.config.set('quality', data.bitrate);

    // this.api = new TidalAPI({
    //   username: data.username,
    //   password: data.password,
    //   token: data.token,
    //   quality: data.quality
    // });
    
    this.login();

    this.commandRouter.logger.info(`[${Date.now()}] ControllerTidalPlugin::saveTidalAccount - ${data.username}`);

    return defer.promise;
  }

  /*
  |--------------------------------------------------------------------------
  | Temporary methods
  |--------------------------------------------------------------------------
  */
  isSet(variable) {
    return variable !== '';
  }
};
