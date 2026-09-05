#include <emscripten/emscripten.h>

#include "../qcommon/q_shared.h"
#include "../qcommon/qcommon.h"

#define Q3JS_ENDPOINT_PREFIX 10
#define Q3JS_MAX_ENDPOINT 0x00ffffff

EM_JS( void, Q3JS_PostServerPacket, ( int endpoint, const void *data, int length ), {
	if ( typeof Module["onServerPacket"] === "function" ) {
		Module["onServerPacket"]( endpoint, HEAPU8.subarray( data, data + length ) );
	}
} );

void Q3JS_ServerSendPacket( int length, const void *data, netadr_t to )
{
	int endpoint;

	if ( to.type != NA_IP || to.ip[0] != Q3JS_ENDPOINT_PREFIX )
		return;

	endpoint = ( to.ip[1] << 16 ) | ( to.ip[2] << 8 ) | to.ip[3];
	if ( endpoint == 0 )
		return;

	Q3JS_PostServerPacket( endpoint, data, length );
}

EMSCRIPTEN_KEEPALIVE int Q3JS_ServerInjectPacket( int endpoint, const void *data, int length )
{
	byte buffer[MAX_MSGLEN];
	msg_t message;
	netadr_t from = { 0 };

	if ( endpoint <= 0 || endpoint > Q3JS_MAX_ENDPOINT || !data ||
		length <= 0 || length > MAX_MSGLEN )
		return 0;

	from.type = NA_IP;
	from.ip[0] = Q3JS_ENDPOINT_PREFIX;
	from.ip[1] = ( endpoint >> 16 ) & 0xff;
	from.ip[2] = ( endpoint >> 8 ) & 0xff;
	from.ip[3] = endpoint & 0xff;
	from.port = BigShort( PORT_SERVER );

	MSG_Init( &message, buffer, sizeof( buffer ) );
	Com_Memcpy( buffer, data, length );
	message.cursize = length;
	Com_RunAndTimeServerPacket( &from, &message );
	return 1;
}

EMSCRIPTEN_KEEPALIVE void Q3JS_ServerCommand( const char *command )
{
	if ( !command || !command[0] )
		return;

	Cbuf_AddText( command );
	Cbuf_AddText( "\n" );
}

EMSCRIPTEN_KEEPALIVE int Q3JS_ServerIsRunning( void )
{
	return com_sv_running && com_sv_running->integer ? 1 : 0;
}
