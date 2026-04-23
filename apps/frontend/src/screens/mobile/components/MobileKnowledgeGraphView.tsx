// 知识图谱 WebView 力导向图（手机端）
// D3.js 本地加载，不依赖外部 CDN

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

import { useTheme } from '../../../hooks/useTheme';
import type { GraphNode, GraphEdge } from '../../../api/knowledgeGraph';

const NODE_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  concept: { label: '概念', color: '#10B981' },
  topic: { label: '主题', color: '#8B5CF6' },
  entity: { label: '实体', color: '#06B6D4' },
  fragment: { label: '片段', color: '#4F46E5' },
  tag: { label: '标签', color: '#F59E0B' },
};

const d3AssetId: number = require('../../../../assets/d3.min.txt');

let _d3SourceCache: string | null = null;

async function loadD3Source(): Promise<string> {
  if (_d3SourceCache) return _d3SourceCache;
  const [asset] = await Asset.loadAsync(d3AssetId);
  const uri = asset.localUri ?? asset.uri;
  const file = new File(uri);
  const buffer = await file.arrayBuffer();
  const content = new TextDecoder().decode(buffer);
  _d3SourceCache = content;
  return content;
}

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
}

export const MobileKnowledgeGraphView: React.FC<Props> = ({ nodes, edges, onNodeClick }) => {
  const colors = useTheme();
  const isDark = colors.background === '#000000' || colors.background === '#0a0a0a' || colors.background === '#1C1C1E';
  const textColor = isDark ? '#E5E5EA' : '#1D1D1F';
  const legendBg = isDark ? 'rgba(28,28,30,.92)' : 'rgba(255,255,255,.92)';
  const legendTitleColor = isDark ? '#E5E5EA' : '#1D1D1F';
  const legendTextColor = isDark ? '#8E8E93' : '#666';
  const legendShadow = isDark ? '0 1px 4px rgba(0,0,0,.4)' : '0 1px 4px rgba(0,0,0,.08)';

  const [d3Source, setD3Source] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadD3Source()
      .then(setD3Source)
      .catch((e) => setLoadError(String(e)));
  }, []);

  const colorMap: Record<string, string> = {};
  const labelMap: Record<string, string> = {};
  const activeTypes = new Set<string>();
  Object.entries(NODE_TYPE_CONFIG).forEach(([k, v]) => {
    colorMap[k] = v.color;
    labelMap[k] = v.label;
  });

  const graphNodes = nodes.map((n) => ({
    id: n.id,
    name: n.name,
    node_type: (n as any).node_type ?? (n as any).type ?? 'concept',
    description: n.description || '',
  }));

  graphNodes.forEach((n) => {
    if (n.node_type) activeTypes.add(n.node_type);
  });

  const graphLinks = edges
    .filter((e) => {
      const src = (e as any).source ?? (e as any).source_node_id;
      const tgt = (e as any).target ?? (e as any).target_node_id;
      return src != null && tgt != null;
    })
    .map((e) => ({
      source: (e as any).source ?? (e as any).source_node_id,
      target: (e as any).target ?? (e as any).target_node_id,
      edge_type: (e as any).edge_type ?? (e as any).type ?? '',
      description: (e as any).description ?? '',
    }));

  const legendHtml = useMemo(() => {
    let html = '<div class="legend-title">例</div>';
    activeTypes.forEach((t) => {
      const c = colorMap[t] || '#666';
      const l = labelMap[t] || t;
      html += `<div class="legend-item"><span class="legend-dot" style="background:${c}"></span><span class="legend-text">${l}</span></div>`;
    });
    return html;
  }, []);

  const html = useMemo(() => {
    if (!d3Source) return '';
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:transparent}
svg{width:100%;height:100%;display:block}
.link{stroke-opacity:.4}
.node-label{font-size:9px;font-weight:600;fill:${textColor};pointer-events:none;text-anchor:middle}
.legend{position:absolute;bottom:12px;left:12px;background:${legendBg};backdrop-filter:blur(10px);border-radius:10px;padding:8px 12px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:${legendShadow}}
.legend-title{font-size:11px;font-weight:600;color:${legendTitleColor};margin-bottom:4px}
.legend-item{display:flex;align-items:center;gap:6px;margin-top:3px}
.legend-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.legend-text{font-size:11px;color:${legendTextColor}}
#status{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#999;font-size:14px}
</style>
</head>
<body>
<svg id="graph"></svg>
<div id="status">正在渲染图谱...</div>
<div class="legend" id="legend">${legendHtml}</div>
<script>
${d3Source}
</script>
<script>
(function(){
  var DATA = ${JSON.stringify({ nodes: graphNodes, links: graphLinks })};
  var COLORS = ${JSON.stringify(colorMap)};
  var LABELS = ${JSON.stringify(labelMap)};
  var statusEl = document.getElementById('status');
  var vw = window.innerWidth;
  var vh = window.innerHeight;

  if(!DATA.nodes.length){statusEl.textContent='暂无节点';return}
  statusEl.textContent='渲染中...';

  var nds = DATA.nodes.map(function(n){
    return {id: Number(n.id), name: n.name, node_type: n.node_type, description: n.description||''};
  });
  var lks = DATA.links.map(function(l){
    return {source: Number(l.source), target: Number(l.target)};
  });

  var svg = d3.select('#graph').attr('viewBox',[0,0,vw,vh]);
  var zoom = d3.zoom().scaleExtent([.3,5]).on('zoom',function(e){group.attr('transform',e.transform)});
  svg.call(zoom);

  svg.append('defs').append('marker')
    .attr('id','arrow').attr('viewBox','0 -5 10 10')
    .attr('refX',14).attr('refY',0).attr('markerWidth',6).attr('markerHeight',6).attr('orient','auto')
    .append('path').attr('d','M0,-5L10,0L0,5').attr('fill','#999');

  var group = svg.append('g');

  var link = group.selectAll('.link').data(lks).join('line')
    .attr('class','link')
    .attr('stroke','#999').attr('stroke-width',1.5)
    .attr('marker-end','url(#arrow)');

  var nodeGroup = group.selectAll('.ng').data(nds).join('g')
    .attr('class','ng')
    .call(d3.drag().on('start',dragStart).on('drag',dragMove).on('end',dragEnd));

  nodeGroup.append('circle')
    .attr('r',6)
    .attr('fill',function(d){ return COLORS[d.node_type]||'#666'; })
    .attr('stroke','#fff').attr('stroke-width',2)
    .on('click',function(ev,d){
      try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'nodeClick',id:d.id,name:d.name,nodeType:d.node_type,description:d.description}));}catch(e){}
    });

  group.selectAll('.lg').data(nds).join('g').attr('class','lg')
    .append('text').attr('class','node-label').attr('dy',18)
    .text(function(d){
      var t = d.name||'';
      return t.length>12 ? t.slice(0,11)+'...' : t;
    });

  var sim = d3.forceSimulation(nds)
    .force('link',d3.forceLink(lks).id(function(d){return d.id}).distance(80).strength(.3))
    .force('charge',d3.forceManyBody().strength(-120))
    .force('center',d3.forceCenter(vw/2,vh/2))
    .force('collision',d3.forceCollide().radius(20))
    .on('tick',ticked);

  function ticked(){
    link.attr('x1',function(d){return d.source.x})
      .attr('y1',function(d){return d.source.y})
      .attr('x2',function(d){return d.target.x})
      .attr('y2',function(d){return d.target.y});
    group.selectAll('.ng').attr('transform',function(d){return 'translate('+d.x+','+d.y+')'});
    group.selectAll('.lg').attr('transform',function(d){return 'translate('+d.x+','+d.y+')'});
  }

  function dragStart(ev,d){if(!ev.active)sim.alphaTarget(.3).restart();d.fx=d.x;d.fy=d.y;}
  function dragMove(ev,d){d.fx=ev.x;d.fy=ev.y;}
  function dragEnd(ev,d){if(!ev.active)sim.alphaTarget(0);d.fx=null;d.fy=null;}

  setTimeout(function(){
    try{
      var bbox = group.node().getBBox();
      var pad = 40;
      var bw = bbox.width || 1;
      var bh = bbox.height || 1;
      var scale = Math.min((vw-pad*2)/bw,(vh-pad*2)/bh,1.5);
      var tx = (vw-bw*scale)/2-bbox.x*scale;
      var ty = (vh-bh*scale)/2-bbox.y*scale;
      svg.transition().duration(600).call(zoom.transform,d3.zoomIdentity.translate(tx,ty).scale(scale));
    }catch(e){
      console.error('fitToScreen error:',e);
    }
    statusEl.style.display='none';
  },2000);
})();
</script>
</body>
</html>`;
  }, [d3Source, textColor, legendBg, legendTitleColor, legendTextColor, legendShadow, legendHtml, graphNodes, graphLinks, colorMap]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'nodeClick' && onNodeClick) {
        const clickedNode = nodes.find((n) => String(n.id) === String(data.id));
        if (clickedNode) onNodeClick(clickedNode);
      }
    } catch (e) {}
  }, [nodes, onNodeClick]);

  if (loadError) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.error, fontSize: 14 }}>{loadError}</Text>
      </View>
    );
  }

  if (!d3Source) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={[styles.webview, { backgroundColor: colors.background }]}
        onMessage={handleMessage}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
});

export default MobileKnowledgeGraphView;
