/*
 Documentation coming soon.
*/

var XML        = require('xml'),
    mime       = require('mime'),
    fs         = require('fs');

function Podcast (options, items) {
    options = options || {};

    this.title          = options.title || 'Untitled Podcast Feed';
    this.description    = options.description || '';
    this.generator      = options.generator || 'Podcast for Node';
    this.feed_url       = options.feed_url;
    this.site_url       = options.site_url;
    this.image_url      = options.image_url;
    this.author         = options.author;
    this.categories     = options.categories;
    this.pubDate        = options.pubDate;
    this.docs           = options.docs;
    this.copyright      = options.copyright;
    this.language       = options.language;
    this.managingEditor = options.managingEditor;
    this.webMaster      = options.webMaster;
    this.ttl            = options.ttl;
    //option to return feed as GeoRSS is set automatically if feed.lat/long is used
    this.geoRSS         = options.geoRSS || false;

    this.itunesAuthor   = options.itunesAuthor || options.author;
    this.itunesSubtitle = options.itunesSubtitle;
    this.itunesSummary  = options.itunesSummary || options.description;
    this.itunesOwner    = options.itunesOwner || {"name":options.author || "","email":""}; // {name:String, email:String}
    this.itunesExplicit = options.itunesExplicit || false;
    this.itunesCategory = options.itunesCategory || options.categories; // [{text:String, subcats:[{name:String, subcat:Array}]}]
    this.itunesImage    = options.itunesImage || options.image_url;

    this.items          = items || [];

    this.item = function (options) {
        options = options || {};
        var item = {
            title:          options.title || 'No title',
            description:    options.description || '',
            url:            options.url,
            guid:           options.guid,
            categories:     options.categories || [],
            author:         options.author,
            date:           options.date,
            lat:            options.lat,
            long:           options.long,
            enclosure:      options.enclosure || false,
            itunesAuthor:   options.itunesAuthor || options.author,
            itunesExplicit: options.itunesExplicit || false,
            itunesSubtitle: options.itunesSubtitle,
            itunesSummary:  options.itunesSummary || options.description,
            itunesDuration: options.itunesDuration,
            itunesKeywords: options.itunesKeywords // string array   
        };

        this.items.push(item);
        return this;
    };

    this.xml = function(indent) {
        return '<?xml version="1.0" encoding="UTF-8"?>\n'
                + XML(generateXML(this), indent);
    }

}

function ifTruePush(bool, array, data) {
    if (bool) {
        array.push(data);
    }
}

function buildiTunesCategories(categories)
{
    var arr = [];
    if(typeof(categories)=="Array")
    {
        for(var i=0; i<categories.length;i++)
        {
            if(categories[i].subcats)
            {
                arr.push({'itunes:category': [{ _attr: {text: categories[i].text }},buildiTunesCategories(categories[i].subcats)]});
            }
            else
            {
                arr.push({'itunes:category': { _attr: {text: categories[i].text }}});
            }
        }
    }
    return arr;
}

function generateXML (data){

    var channel = [];
    channel.push({ title:           { _cdata: data.title } });
    channel.push({ description:     { _cdata: data.description || data.title } });
    channel.push({ link:            data.site_url || 'http://github.com/maxnowack/node-podcast' });
    // image_url set?
    if (data.image_url) {
        channel.push({ image:  [ {url: data.image_url}, {title: data.title},  {link: data.site_url} ] });
    }
    channel.push({ generator:       data.generator });
    channel.push({ lastBuildDate:   new Date().toGMTString() });

    ifTruePush(data.feed_url, channel, { 'atom:link': { _attr: { href: data.feed_url, rel: 'self', type: 'application/rss+xml' } } });
    ifTruePush(data.author, channel, { 'author': { _cdata: data.author } });
    ifTruePush(data.pubDate, channel, { 'pubDate': new Date(data.pubDate).toGMTString() });
    ifTruePush(data.copyright, channel, { 'copyright':  { _cdata: data.copyright } });
    ifTruePush(data.language, channel, { 'language': { _cdata: data.language } });
    ifTruePush(data.managingEditor, channel, { 'managingEditor': { _cdata: data.managingEditor } });
    ifTruePush(data.webMaster, channel, { 'webMaster': { _cdata: data.webMaster } });
    ifTruePush(data.docs, channel, { 'docs': data.docs });
    ifTruePush(data.ttl, channel, { 'ttl': data.ttl });

    ifTruePush(data.itunesAuthor, channel, { 'itunes:author': data.itunesAuthor });
    ifTruePush(data.itunesSubtitle, channel, { 'itunes:subtitle': data.itunesSubtitle });
    ifTruePush(data.itunesSummary, channel, { 'itunes:summary': data.itunesSummary });
    ifTruePush(data.itunesImage, channel, { 'itunes:image': { _attr:{href: data.itunesImage }}});
    channel.push({ 'itunes:explicit': (data.itunesExplicit ? 'Yes' : 'No')});

    ifTruePush(data.itunesOwner, channel, {'itunes:owner': [{'itunes:name':data.itunesOwner.name},{'itunes:email':data.itunesOwner.email}]});
    ifTruePush(typeof(data.itunesCategory)!="undefined", channel, buildiTunesCategories(data.itunesCategory));

    if (data.categories) {
        data.categories.forEach(function(category) {
            ifTruePush(category, channel, { category: { _cdata: category } });
        });
    }

    data.items.forEach(function(item) {
        var item_values = [
                    { title:        { _cdata: item.title } }
                ];
        ifTruePush(item.description, item_values, { description:  { _cdata: item.description } });
        ifTruePush(item.url, item_values, { link: item.url });
        ifTruePush(item.link || item.guid || item.title, item_values, { guid:         [ { _attr: { isPermaLink: !item.guid && !!item.url } }, item.guid || item.url || item.title ]  });

        if(typeof(item.categories)=="Array") {item.categories.forEach(function(category) {
            ifTruePush(category, item_values, { category: { _cdata: category } });
        })};

        ifTruePush(item.author || data.author, item_values, { 'dc:creator': { _cdata: item.author || data.author } });
        ifTruePush(item.date, item_values, { pubDate:      new Date(item.date).toGMTString() });

        ifTruePush(item.itunesAuthor || data.itunesAuthor, item_values, { 'itunes:author': item.itunesAuthor || data.itunesAuthor });
        item_values.push({ 'itunes:explicit': (item.itunesExplicit || data.itunesExplicit ? 'Yes' : 'No')});
        ifTruePush(item.itunesSubtitle || data.itunesSubtitle, item_values, { 'itunes:subtitle': item.itunesSubtitle || data.itunesSubtitle });
        ifTruePush(item.itunesSummary || data.itunesSummary, item_values, { 'itunes:summary': item.itunesSummary || data.itunesSummary });
        ifTruePush(item.itunesDuration, item_values, { 'itunes:duration': item.itunesDuration });
        ifTruePush(item.itunesKeywords, item_values, { 'itunes:keywords': item.itunesKeywords });

        //Set GeoRSS to true if lat and long are set
        data.geoRSS = data.geoRSS || (item.lat && item.long);
        ifTruePush(item.lat, item_values, {'geo:lat': item.lat});
        ifTruePush(item.long, item_values, {'geo:long': item.long});

        if( item.enclosure && item.enclosure.url ) {
            if( item.enclosure.file ) {
                item_values.push({
                    enclosure : {
                        _attr : {
                            url : item.enclosure.url,
                            length : fs.statSync(item.enclosure.file).size,
                            type : mime.lookup(item.enclosure.file)
                        }
                    }
                });
            } else {
                item_values.push({
                    enclosure : {
                        _attr : {
                            url : item.enclosure.url,
                            length : item.enclosure.size || 0,
                            type : item.enclosure.mime || mime.lookup(item.enclosure.url)
                        }
                    }
                });
            }
        }

        channel.push({ item: item_values });

    });

    //set up the attributes for the RSS feed.
    var _attr = {
        'xmlns:dc':         'http://purl.org/dc/elements/1.1/',
        'xmlns:content':    'http://purl.org/rss/1.0/modules/content/',
        'xmlns:atom':       'http://www.w3.org/2005/Atom',
        'xmlns:itunes':     'http://www.itunes.com/dtds/podcast-1.0.dtd',
        version: '2.0'
    };

    //only add namespace if GeoRSS is true
    if(data.geoRSS){
        _attr['xmlns:geo'] = 'http://www.w3.org/2003/01/geo/wgs84_pos#';
    }

    return {
        rss: [
            { _attr: _attr },
            { channel: channel }
        ]
    };
}

module.exports = Podcast;
