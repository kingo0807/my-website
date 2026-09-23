---
layout: article
title: "文章目录"
permalink: /guides/
---

# 文章目录

{% assign ordered_guides = site.guides | sort: 'guide_order' %}

<ul class="guide_list">
{% for guide in ordered_guides %}
  <li>
    <a href="{{ guide.url | relative_url }}">{{ guide.title | escape }}</a>
    {% if guide.description %}
    <p>{{ guide.description | escape }}</p>
    {% endif %}
  </li>
{% endfor %}
</ul>