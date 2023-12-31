const express = require("express");
const axios = require("axios");
const querystring = require("querystring");
const path = require("path");
const ejs = require("ejs");
const fs = require("fs");
require("dotenv").config()
// importing external modules

// the package.json file is modified to add "start": "node app.js" to scripts
// for consistent reupdating, nodemon is installed with npm install --save-dev nodemon
// to run with nodemon, npx nodemon app.js is called in the terminal

const app = express();
const port = process.env.PORT || 3000;
// establishing the port the server will listen on

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
// set the view engine to ejs
// set the views folder to the relative path of the views folder

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;
// using information from .env file

let access_token = "";
let access_token_expiry = null;
let refresh_token = "";
let id = "";
let recommendedTracksUris = [];

const authorizationEndpoint = "https://accounts.spotify.com/authorize";
// the authorization endpoint
const tokenEndpoint = "https://accounts.spotify.com/api/token";
// the token endpoint
const generalUserEndpoint = "https://api.spotify.com/v1/me";
// the general user endpoint
const audioFeaturesEndpoint = "https://api.spotify.com/v1/audio-features";
// the audio features endpoint
const recommendationsEndpoint = "https://api.spotify.com/v1/recommendations"
// the recommendations endpoint

async function refreshAccessToken(res) {
    const data = querystring.stringify({
        "grant_type": "refresh_token",
        "refresh_token": refresh_token
    });

    const headers = {
        "Authorization": "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
    }

    try {
        const requestRefreshedTokenResponse = await axios.post(tokenEndpoint, data, {headers});
        access_token = requestRefreshedTokenResponse.data.access_token;
        access_token_expiry = Math.floor(Date.now() / 1000) + 3600;
        console.log("Access token refreshed.");
    } catch (error) {
        // if there is an error during the try block, execute catch block
        console.error("Error requesting for refreshed access token: ", error.message);
        // console error for dev information

        const errorExplanation = "there was an issue while refreshing your access token. :("

        if (error.response && error.response.data && error.response.data.error) {

            res.render("error", {error: error.response.data.error, errorMessage: error.message, statusCode: error.response.status, errorExplanation})
        } else {
            res.render("error", {errorExplanation})
            // default to this response if error not known
        }
    }
}

app.use(express.static("public"));
// serving the static files in the public folder
app.use(express.static("images"));

app.use((req, res, next) => {
    if (!access_token) {
        const validRoutes = ["/", "/login", "/callback"];
        if (!validRoutes.includes(req.path)) {
            res.redirect("/login");
            return;
            // prevents next() from redirecting without access token
        } else {
            next();
        }
    } else {
        const currentTime = Math.floor(Date.now() / 1000)
        if (currentTime >= access_token_expiry) {
            refreshAccessToken(res);
            res.redirect("/information");
        }
        next();
    }
})

app.get("/login", (req, res) => {
    // express route for handling get requests; path, callback
    // when get request matches path, following function called
    // login route handler
    // takes two args, request object and respone object

    const queryParams = querystring.stringify({
        client_id,
        response_type: "code",
        redirect_uri,
        scope: "ugc-image-upload playlist-modify-public playlist-modify-private user-read-playback-state user-modify-playback-state user-read-currently-playing streaming playlist-read-private playlist-read-collaborative user-top-read user-read-recently-played user-read-email user-read-private",
        show_dialog: false,
        source: "login"
        // no need to encode stuff, querystring does it for you
    });

    const authorizationURL = authorizationEndpoint + "?" + queryParams;
    // form complete url

    res.redirect(authorizationURL);
});

app.get("/callback", async (req, res) => {
    // callback route handler (after auth)
    // asynchronous as post request must occur for access token

    const {code, source} = req.query;
    // gets query from request (url) and extracts the value associated with "code"
    // code isnt an object, but extracts the value of the code parameter from the object assigned

    const data = querystring.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri
        // variable names are same as params, so no need for keyvalue pair
    });

    const headers = {
        "Authorization": "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
    }

    try {
        const response = await axios.post(tokenEndpoint, data, {headers});
        // asynchronous code, so await ensures the program waits for this to execute before continuing
        // three parameters, url, data, and options
        // data is in content-type, so has been querystring.stringified
        // options is an object literal, and contains the headers option which is also an object

        access_token = response.data.access_token;
        refresh_token = response.data.refresh_token;
        access_token_expiry = Math.floor(Date.now() / 1000) + 3600;
        // self-explanatory

        res.redirect("/information");
        // redirect to information path
    } catch (error) {
        console.error("Error requesting for access token: ", error.message);

        const errorExplanation = "there was an issue while getting your access token. :("

        if (error.response && error.response.data && error.response.data.error) {
            

            res.render("error", {error: error.response.data.error, errorMessage: error.message, statusCode: error.response.status, errorExplanation})
        } else {
            res.render("error", {errorExplanation})
        }
    };
});

app.get("/information", async (req, res) => {

    try {
        const profileResponse = await axios.get(generalUserEndpoint, {
            // get request for user information
            headers: {
                "Authorization": "Bearer " + access_token
            }
            // options is an object including the headers object 
        });

        id = profileResponse.data.id;
        const display_name = profileResponse.data.display_name;
        const email = profileResponse.data.email;
        const images = profileResponse.data.images;

        console.log("the following information is for: ");
        console.log(display_name);
        console.log(email);
        console.log("access_token: ");
        console.log(access_token);

        const topQueryString = querystring.stringify({
            time_range: "medium_term",
            limit: 100
        });

        const topTracksResponse = await axios.get(generalUserEndpoint + "/top/tracks?" + topQueryString, {
            headers: {
                "Authorization": "Bearer " + access_token
            }
        });

        const trackItems = topTracksResponse.data.items;
        const trackNamesArray = trackItems.map((item) => item.name);
        const trackIdsArray = trackItems.map((item) => item.id);
        const trackIds = trackIdsArray.join(",");
        // obtains the trackids of each and creates comma-separated list
        
        const topArtistsResponse = await axios.get(generalUserEndpoint + "/top/artists?" + topQueryString, {
            headers: {
                "Authorization": "Bearer " + access_token
            }
        });

        const artistItems = topArtistsResponse.data.items;
        const artistNamesArray = artistItems.map((item) => item.name);
        const artistIdsArray = artistItems.map((item) => item.id);
        const artistIds = artistIdsArray.join(",");
        // obtains the artistids of each and creates comma-separated list

        let averageArtistPopularity = 0;

        artistItems.forEach((item) => {
            averageArtistPopularity += item.popularity;
        });
        averageArtistPopularity /= artistItems.length;
        // calculating average artist popularity

        let averageTrackPopularity = 0;
        trackItems.forEach((item) => {
            averageTrackPopularity += item.popularity;
        });
        averageTrackPopularity /= trackItems.length;
        // calculating average track popularity

        const topTracksAudioFeaturesQueryString = querystring.stringify({
            ids: trackIds
        });
        
        const topTracksAudioFeaturesResponse = await axios.get(audioFeaturesEndpoint + "?" + topTracksAudioFeaturesQueryString, {
            headers: {
                "Authorization": "Bearer " + access_token
            }
        });

        const audio_features = topTracksAudioFeaturesResponse.data.audio_features;

        const desiredAudioFeatures = ["danceability", "energy", "key", "loudness", "mode", "speechiness",
         "acousticness", "instrumentalness", "liveness", "valence", "tempo", "duration_ms"];
        //  establish the desired audio features

        let averageAudioFeatures = {};
        // declare the object containing the average audio features of the user

         desiredAudioFeatures.forEach((feature) => {
            // for each feature, set the corresponding property to 0
            averageAudioFeatures[feature] = 0;
         });

         audio_features.forEach((song) => {
            // for every song
            desiredAudioFeatures.forEach((feature) => {
                // and every audio feature of the song
                averageAudioFeatures[feature] += song[feature];
                // add the songs feature value to the corresponding feature property of the average obj
             });
         });

         desiredAudioFeatures.forEach((feature) => {
            averageAudioFeatures[feature] /= audio_features.length;
         });

         const songLimit = 100;

         const recommendationsQueryString = querystring.stringify({
            limit: songLimit,
            seed_artists: artistIdsArray.slice(0, 3).join(","),
            seed_tracks: trackIdsArray.slice(0, 2).join(","),
            target_acousticness: averageAudioFeatures["acousticness"],
            target_danceability: averageAudioFeatures["danceability"],
            target_duration_ms: Math.round(averageAudioFeatures["duration_ms"]),
            target_energy: averageAudioFeatures["energy"],
            target_instrumentalness: averageAudioFeatures["instrumentalness"],
            target_liveness: averageAudioFeatures["liveness"],
            target_loudness: averageAudioFeatures["loudness"],
            target_speechiness: averageAudioFeatures["speechiness"],
            target_tempo: averageAudioFeatures["tempo"],
            target_valence: averageAudioFeatures["valence"]
         });

         const recommendationsResponse = await axios.get(recommendationsEndpoint + "?" + recommendationsQueryString, {
            headers: {
                "Authorization": "Bearer " + access_token
            }
         });

         const recommendedTracks = recommendationsResponse.data.tracks;
         recommendedTracksUris = recommendedTracks.map((track) => track.uri);
         const recommendedTracksInfo = recommendedTracks.map((track) => ({
            id: track.id,
            name: track.name,
            artist: track.artists.map((artist) => artist.name).join(", "),
            link: track.external_urls.spotify,
            cover: track.album.images[0].url
         }));

         let userImage;

         if (images[1]) {
            userImage = images[1].url;
         } else {
            userImage = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/2048px-Default_pfp.svg.png";
         };

        res.render("information", {userID: id, displayName: display_name, userImage, trackIdsArray,
             artistIdsArray, trackNamesArray, artistNamesArray, averageAudioFeatures, averageTrackPopularity, averageArtistPopularity, recommendedTracksInfo, songLimit})
        // rendering the ejs template with the corresponding values
    } catch (error) {
        console.error("Error occurred while requesting for and analysing user and track information: ", error.message);

        if (error.response.status === 403) {
            const errorExplanation = "there was an issue while authenticating you. :("
            res.render("error", {error: error.response.data.error, errorMessage: error.message, statusCode: error.response.status, errorExplanation})
        } else {
            console.error("Error occurred while requesting for and analysing user and track information: ", error.message);
            const errorExplanation = "there was an issue while analysing your info. :("

            if (error.response && error.response.data && error.response.data.error) {
                res.render("error", {error: error.response.data.error, errorMessage: error.message, statusCode: error.response.status, errorExplanation})
            } else {
                res.render("error", {statusCode: 500, errorExplanation})
            }
        }
    }
        
});

app.get("/create-playlist", async (req, res) => {
    try {
        const createData = ({
            name: "recommended for you!",
            description: "personalised by vkay"
        });

        const playlistCreateResponse = await axios.post(`https://api.spotify.com/v1/users/${id}/playlists`, createData, {
            headers: {
                "Authorization": "Bearer " + access_token,
                "Content-Type": "application/json"
            }
        });
        const playlist_id = playlistCreateResponse.data.id;

        let coversBase64 = [];

        const coversPath = path.join(__dirname, "..", "images", "covers");

        fs.readdir(coversPath, async (err, files) => {
            try {
                let i = 0;
                files.forEach((file) => {
                    const filePath = path.join(coversPath, file)
                    const fileBuffer = fs.readFileSync(filePath);
                    const base64fileBuffer = fileBuffer.toString("base64");
                    coversBase64[i] = base64fileBuffer;
                    i++;
                });

                const randomImageNumber = Math.round(Math.random() * coversBase64.length);

                const playlistCoverResponse = await axios.put(`https://api.spotify.com/v1/playlists/${playlist_id}/images`, coversBase64[randomImageNumber], {
                    headers: {
                        "Authorization": "Bearer " + access_token,
                        "Content-Type": "image/jpeg"
                    }
                });
    
                const addData = {
                    uris: recommendedTracksUris
                };
    
                const playlistAddResponse = await axios.post(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks`, addData, {
                    headers: {
                        "Authorization": "Bearer " + access_token,
                        "Content-Type": "application/json"
                    }
                });
                res.render("done");
            } catch (error) {
                console.error("Error occurred while creating playlist in file-reading phase: ", error.message);
                const errorExplanation = "there was an issue while making your playlist. :("

                if (error.response && error.response.data && error.response.data.error) {
                    res.render("error", {error: error.response.data.error, errorMessage: error.message, statusCode: error.response.status, errorExplanation})
                } else {
                    res.render("error", {statusCode: 500, errorExplanation})
                }
            }
        });


    } catch (error) {
        console.error("Error occurred while creating playlist in creation phase: ", error.message);
        const errorExplanation = "there was an issue while making your playlist. :("

        if (error.response && error.response.data && error.response.data.error) {
            res.render("error", {error: error.response.data.error, errorMessage: error.message, statusCode, errorExplanation})
        } else {
            res.render("error", {statusCode: 500, errorExplanation})
        }
    }
}) 

app.get("/done", (req, res) => {
    res.render("done");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = app;