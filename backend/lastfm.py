import httpx
from config import LASTFM_API_KEY, LASTFM_BASE_URL


async def fetch_user_information(username: str):
    params = {
        "method": "user.getinfo",
        "user": username,
        "api_key": LASTFM_API_KEY,
        "format": "json",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url=LASTFM_BASE_URL, params=params)
        return response.json()


async def fetch_user_top_artists(username: str, period: str = "overall"):
    params = {
        "method": "user.gettopartists",
        "user": username,
        "period": period,
        "api_key": LASTFM_API_KEY,
        "format": "json",
        "page": 1,
        "limit": 5,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url=LASTFM_BASE_URL, params=params)
        return response.json()


async def fetch_user_top_artists_12month(username: str, limit=50):
    params = {
        "method": "user.gettopartists",
        "user": username,
        "period": "12month",
        "api_key": LASTFM_API_KEY,
        "format": "json",
        "page": 1,
        "limit": limit,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url=LASTFM_BASE_URL, params=params)
        data = response.json()
        return [
            artist["name"] for artist in data.get("topartists", {}).get("artist", [])
        ]


async def fetch_user_recent_tracks(username: str):
    params = {
        "method": "user.getrecenttracks",
        "user": username,
        "limit": 50,
        "api_key": LASTFM_API_KEY,
        "format": "json",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url=LASTFM_BASE_URL, params=params)

    data = response.json()

    if response.status_code != 200 or "error" in data:
        # handle a cases where a particular users thrown 403,
        # possibly the user's listening info is private or something else
        return None
    return data


async def fetch_user_all_top_artists(username: str, limit=10000):
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
            "format": "json",
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


async def fetch_user_friends(username: str):
    params = {
        "method": "user.getfriends",
        "user": username,
        "api_key": LASTFM_API_KEY,
        "format": "json",
        "limit": 1,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url=LASTFM_BASE_URL, params=params)
        data = response.json()

        return data
