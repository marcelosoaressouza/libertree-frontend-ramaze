# encoding: utf-8
require 'net/http'
require 'nokogiri'
require 'libertree/model'

module Libertree
  def self.markdownify(s)
    return ''  if s.nil? or s.empty?

    markdown ||= Redcarpet::Markdown.new(
      Libertree::Markdown.new,
      {
        autolink: false,
        space_after_headers: true,
        no_intra_emphasis: true,
      }
    )
    markdown.render s
  end

  def self.hashtaggify(s)
    return ''  if s.nil? or s.empty?
    s.force_encoding('utf-8').gsub(/(?<=^|\s)#([\p{Word}\p{Pd}]+)(?=\s|\b|$)/i) {
      %|<a href="/rivers/ensure_exists/%23#{$1.downcase}" class="hashtag" data-hashtag="#{$1.downcase}">##{$1}</a>|
    }
  end

  def self.post_processing(s)
    return ''  if s.nil? or s.empty?

    # Crude autolinker.
    # We cannot do this with redcarpet, as enabling :autolink breaks the normal_text callback
    # This has to be done after processing with markdown, as the markdown renderer filters all HTML.
    s.gsub!(%r{(?<=^|\s|^<p>|^<li>)(https?://[^\b\s$<]+|www\.[^\b\s$<]+)}, "<a href='\\1'>\\1</a>")

    html = Nokogiri::HTML::fragment(s)
    html.css('a').each do |a|
      # strip javascript
      if a['href']
        a['href'] = a['href'].gsub(/javascript:/i, 'nojavascript:')
      end
      # resolve uris
      if a['href'] =~ %r{http://}
        a['href'] = resolve_redirection(a['href'])
      end
    end
    html.to_xhtml
  end

  def self.resolve_redirection( url_s )
    cached = Libertree::Model::UrlExpansion[ url_short: url_s ]
    if cached
      return cached.url_expanded
    end

    resolution = url_s
    begin
      url = URI.parse(url_s)
      res = nil
      num_redirections = 0

      timeout(3) do
        while num_redirections < 8
          if url.host && url.port
            host, port = url.host, url.port
          else
            break
          end

          req = Net::HTTP::Get.new(url.path)
          res = Net::HTTP.start(host, port) { |http|  http.request(req) }

          if res.header['location']
            url = URI.parse(res.header['location'])
            num_redirections += 1
          else
            resolution = url.to_s
            break
          end
        end
      end
    rescue SocketError, Timeout::Error, URI::InvalidURIError, IOError, Errno::ECONNREFUSED, Errno::ECONNRESET, Net::HTTPBadResponse, ArgumentError
      # Use URL as is.  Arbo can delete url_expansions record to force retry.
    end

    Libertree::Model::UrlExpansion.create(
      :url_short => url_s,
      :url_expanded => resolution
    )

    resolution
  end

  def self.render(s)
    markdownify(s)
  end

  module HasRenderableText
    def text_rendered
      Libertree.render self.text
    end
  end

  module Model
    class Post
      include Libertree::HasRenderableText
    end
    class Comment
      include Libertree::HasRenderableText
    end
  end
end
