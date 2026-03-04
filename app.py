"""
Instagram Follower Checker - Backend
Parses Instagram data export JSON files to analyze follower relationships.

Usage:
  1. Go to Instagram > Settings > Your Activity > Download Your Information
  2. Request data in JSON format
  3. Upload the followers.json and following.json files to this app
"""

from flask import Flask, render_template

app = Flask(__name__)


def parse_instagram_json(data, key=None):
    """
    Parse Instagram export JSON data.
    Instagram exports come in different formats depending on the export version.
    """
    usernames = set()

    # If data is a list of relationship objects (newer format)
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                # Handle "string_list_data" format
                if 'string_list_data' in item:
                    for entry in item['string_list_data']:
                        if 'value' in entry:
                            usernames.add(entry['value'])
                # Handle direct "username" field
                elif 'username' in item:
                    usernames.add(item['username'])
                # Handle "value" field directly
                elif 'value' in item:
                    usernames.add(item['value'])

    # If data is a dict (older or alternate format)
    elif isinstance(data, dict):
        # Check for "relationships_followers" or "relationships_following" keys
        for k, v in data.items():
            if isinstance(v, list):
                for item in v:
                    if isinstance(item, dict):
                        if 'string_list_data' in item:
                            for entry in item['string_list_data']:
                                if 'value' in entry:
                                    usernames.add(entry['value'])
                        elif 'username' in item:
                            usernames.add(item['username'])
                        elif 'value' in item:
                            usernames.add(item['value'])
                    elif isinstance(item, str):
                        usernames.add(item)

    return usernames


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        followers_file = request.files.get('followers')
        following_file = request.files.get('following')

        if not followers_file or not following_file:
            return jsonify({'error': 'Both followers and following files are required.'}), 400

        # Parse JSON files
        try:
            followers_data = json.load(followers_file)
            following_data = json.load(following_file)
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid JSON file(s). Make sure you export in JSON format from Instagram.'}), 400

        # Extract usernames
        followers = parse_instagram_json(followers_data, 'followers')
        following = parse_instagram_json(following_data, 'following')

        if not followers and not following:
            return jsonify({
                'error': 'Could not parse usernames from the files. '
                         'Make sure these are Instagram data export files in JSON format.'
            }), 400

        # Compute relationships
        mutual = sorted(followers & following)
        not_following_back = sorted(following - followers)  # You follow them, they don't follow you
        you_dont_follow = sorted(followers - following)     # They follow you, you don't follow them

        return jsonify({
            'success': True,
            'stats': {
                'total_followers': len(followers),
                'total_following': len(following),
                'mutual': len(mutual),
                'not_following_back': len(not_following_back),
                'you_dont_follow': len(you_dont_follow),
            },
            'mutual': mutual,
            'not_following_back': not_following_back,
            'you_dont_follow': you_dont_follow,
        })

    except Exception as e:
        return jsonify({'error': f'Something went wrong: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True, port=8080)
