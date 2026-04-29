import httpx
from config import LASTFM_API_KEY, LASTFM_BASE_URL


async def fetch_user_information(username: str):
    params = {
        "method": "user.getinfo",
        "user": username,
        "api_key": LASTFM_API_KEY,
        "format": "json"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url=LASTFM_BASE_URL, params=params)
        print(response.json())
        return response.json()
    

async def fetch_user_top_artists(username: str):
    params = {
        "method": "user.gettopartists",
        "user": username,
        "period": "overall",
        "api_key": LASTFM_API_KEY,
        "format": "json",
        "page": 1,
        "limit": 5,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url=LASTFM_BASE_URL, params=params)
        print(response.json())
        return response.json()
    
async def fetch_user_recent_tracks(username: str):
    params = {
        "method": "user.getrecenttracks",
        "user": username,
        "limit": 50,
        "api_key": LASTFM_API_KEY,
        "format": "json"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url=LASTFM_BASE_URL, params=params)
        print(response.json())
        return response.json()
    
async def fetch_user_all_top_artists(username: str, limit=1000):
    artists = set()
    page = 1
    first_page_data = None

    while len(artists) < limit:
        params = {
            "method": "user.gettopartists",
            "user": username,
            "limit": 1000,
            "page": page,
            "api_key": LASTFM_API_KEY,
            "format": "json"
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url=LASTFM_BASE_URL, params=params)
            data = response.json()

            artist_lists = data["topartists"]["artist"]

        if page == 1:
            first_page_data = data

        if not artist_lists:
            break

        for artist in artist_lists:
            artists.add(artist["name"])

        page += 1

    return artists, first_page_data



